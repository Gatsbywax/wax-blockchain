import JSBI from "jsbi";
import {
  elastic_limit_parameters,
  resource_limits_config_object,
  resource_limits_state_object,
  resource_limits_object,
  resource_usage_object,
  account_resource_limit,
} from "./resource-limits-private";
import * as constant from "./config";
import {
  EOS_ASSERT,
  EOS_PERCENT,
  static_assert,
  rate_limiting_state_inconsistent,
  resource_limit_exception,
  tx_cpu_usage_exceeded,
  tx_net_usage_exceeded,
  block_resource_exhausted,
  MaxUint64,
  integer_divide_ceil,
} from "./common";
let config: resource_limits_config_object;
let state: resource_limits_state_object;

const resource_limits_db: resource_limits_object[] = [];
const resource_usage_db: resource_usage_object[] = [];

export function initialize_database() {
  config = new resource_limits_config_object();
  state = new resource_limits_state_object(
    config.cpu_limit_parameters.max,
    config.net_limit_parameters.max
  );
}

export function initialize_account(account: String) {
  let limits = new resource_limits_object(account);
  let usage = new resource_usage_object(account);
  resource_limits_db.push(limits);
  resource_usage_db.push(usage);
}

function set_block_parameters(
  cpu_limit_parameters: elastic_limit_parameters,
  net_limit_parameters: elastic_limit_parameters
) {
  cpu_limit_parameters.validate();
  net_limit_parameters.validate();
  if (
    config.cpu_limit_parameters == cpu_limit_parameters &&
    config.net_limit_parameters == net_limit_parameters
  )
    return;
  config.cpu_limit_parameters = cpu_limit_parameters;
  config.net_limit_parameters = net_limit_parameters;
}

export function update_account_usage(accounts: string[], time_slot: number) {
  for (let a of accounts) {
    const usage = resource_usage_db.find((x) => x.owner === a);
    usage?.net_usage.add(0, time_slot, config.account_net_usage_average_window);
    usage?.cpu_usage.add(0, time_slot, config.account_net_usage_average_window);
    // console.log("usage", usage);
  }
}

export function add_transaction_usage(
  accounts: String[],
  cpu_usage: number,
  net_usage: number,
  time_slot: number
) {
  for (let a of accounts) {
    const usage = resource_usage_db.find((x) => x.owner === a);
    if (!usage) throw new Error(`usage account ${a} not exist`);
    let { ram_bytes: unused, net_weight, cpu_weight } = get_account_limits(a);
    usage.net_usage.add(
      net_usage,
      time_slot,
      config.account_net_usage_average_window
    );
    usage.cpu_usage.add(
      cpu_usage,
      time_slot,
      config.account_cpu_usage_average_window
    );

    if (cpu_weight >= 0 && state.total_cpu_weight > 0) {
      let window_size = JSBI.BigInt(config.account_cpu_usage_average_window);
      let virtual_network_capacity_in_window = JSBI.multiply(
        JSBI.BigInt(state.virtual_cpu_limit),
        window_size
      );
      let cpu_used_in_window = JSBI.divide(
        JSBI.multiply(
          JSBI.BigInt(Number(usage?.cpu_usage.value_ex)),
          window_size
        ),
        JSBI.BigInt(constant.rate_limiting_precision)
      );

      let user_weight = JSBI.BigInt(cpu_weight);
      let all_user_weight = JSBI.BigInt(state.total_cpu_weight);

      let max_user_use_in_window = JSBI.divide(
        JSBI.multiply(virtual_network_capacity_in_window, user_weight),
        all_user_weight
      );

      EOS_ASSERT(
        cpu_used_in_window <= max_user_use_in_window,
        tx_cpu_usage_exceeded,
        "authorizing account '${n}' has insufficient cpu resources for this transaction"
      );
    }

    if (net_weight >= 0 && state.total_net_weight > 0) {
      let window_size = JSBI.BigInt(config.account_net_usage_average_window);
      let virtual_network_capacity_in_window = JSBI.multiply(
        JSBI.BigInt(state.virtual_net_limit),
        window_size
      );
      let net_used_in_window = JSBI.divide(
        JSBI.multiply(
          JSBI.BigInt(Number(usage?.net_usage.value_ex)),
          window_size
        ),
        JSBI.BigInt(constant.rate_limiting_precision)
      );

      let user_weight = JSBI.BigInt(net_weight);
      let all_user_weight = JSBI.BigInt(state.total_net_weight);

      let max_user_use_in_window = JSBI.divide(
        JSBI.multiply(virtual_network_capacity_in_window, user_weight),
        all_user_weight
      );

      EOS_ASSERT(
        net_used_in_window <= max_user_use_in_window,
        tx_net_usage_exceeded,
        "authorizing account '${n}' has insufficient net resources for this transaction"
      );
    }
  }

  state.pending_cpu_usage += cpu_usage;
  state.pending_net_usage += net_usage;

  EOS_ASSERT(
    state.pending_cpu_usage <= config.cpu_limit_parameters.max,
    block_resource_exhausted,
    "Block has insufficient cpu resources"
  );
  EOS_ASSERT(
    state.pending_net_usage <= config.net_limit_parameters.max,
    block_resource_exhausted,
    "Block has insufficient net resources"
  );
}

export function set_account_limits(
  account: String,
  ram_bytes: number,
  net_weight: number,
  cpu_weight: number
): boolean {
  let pending_limits = resource_limits_db.find(
    (x) => x.owner === account && x.pending == true
  );
  let limits;
  let decreased_limit = false;
  if (!pending_limits) {
    limits = resource_limits_db.find(
      (x) => x.owner === account && x.pending == false
    );
    if (!limits) {
      throw new Error(`account ${account} not exist`);
    }
    pending_limits = new resource_limits_object(
      account,
      true,
      net_weight,
      cpu_weight,
      ram_bytes
    );
    resource_limits_db.push(pending_limits);

    if (ram_bytes >= 0) {
      decreased_limit = limits?.ram_bytes < 0 || ram_bytes < limits.ram_bytes;
    }
  }

  pending_limits.ram_bytes = ram_bytes;
  pending_limits.net_weight = net_weight;
  pending_limits.cpu_weight = cpu_weight;

  return decreased_limit;
}

function is_unlimited_cpu(account: String) {
  const buo = resource_limits_db.find(
    (x) => x.owner === account && x.pending === true
  );
  if (buo) {
    return buo.cpu_weight == -1;
  }
  return false;
}

export function process_account_limit_updates() {
  const pendings = resource_limits_db.filter((x) => x.pending === true);
  for (const pending of pendings) {
    const actual_entry = resource_limits_db.find(
      (x) => x.owner == pending.owner && x.pending === false
    );
    if (!actual_entry) throw new Error(`account ${pending.owner} not found`);
    const { total: total_ram_bytes, value: ram_bytes } = update_state_and_value(
      state.total_ram_bytes,
      actual_entry.ram_bytes,
      pending.ram_bytes,
      "ram_bytes"
    );
    state.total_ram_bytes = total_ram_bytes;
    pending.ram_bytes = ram_bytes;
    const { total: total_cpu_weight, value: cpu_weight } =
      update_state_and_value(
        state.total_cpu_weight,
        actual_entry.cpu_weight,
        pending.cpu_weight,
        "cpu_weight"
      );
    state.total_cpu_weight = cpu_weight;
    pending.cpu_weight = cpu_weight;
    const { total: total_net_weight, value: net_weight } =
      update_state_and_value(
        state.total_net_weight,
        actual_entry.net_weight,
        pending.net_weight,
        "net_weight"
      );
    state.total_net_weight = total_net_weight;
    pending.net_weight = net_weight;
  }
}

function update_state_and_value(
  total: number,
  value: number,
  pending_value: number,
  debug_which: String
): any {
  if (value > 0) {
    EOS_ASSERT(
      total >= value,
      rate_limiting_state_inconsistent,
      `underflow when reverting old value to ${debug_which}`
    );
    total -= value;
  }

  if (pending_value > 0) {
    EOS_ASSERT(
      JSBI.subtract(MaxUint64, JSBI.BigInt(total)) >=
        JSBI.BigInt(pending_value),
      rate_limiting_state_inconsistent,
      `overflow when applying new value to ${debug_which}`
    );
    total += pending_value;
  }

  value = pending_value;
  return { total, value };
}

export function process_block_usage(block_num: number) {
  state.average_block_cpu_usage.add(
    state.pending_cpu_usage,
    block_num,
    config.cpu_limit_parameters.periods
  );
  state.update_virtual_cpu_limit(config);
  state.pending_cpu_usage = 0;

  state.average_block_net_usage.add(
    state.pending_net_usage,
    block_num,
    config.net_limit_parameters.periods
  );
  state.update_virtual_net_limit(config);
  state.pending_net_usage = 0;
}

function get_total_net_weight() {
  return state.total_net_weight;
}

export function get_virtual_block_cpu_limit() {
  return state.virtual_cpu_limit;
}

export function get_virtual_block_net_limit() {
  return state.virtual_net_limit;
}

function get_block_cpu_limit() {
  return config.cpu_limit_parameters.max - state.pending_cpu_usage;
}

function get_block_net_limit() {
  return config.net_limit_parameters.max - state.pending_net_usage;
}

export function get_account_cpu_limit(
  name: String,
  greylist_limit: number = constant.maximum_elastic_resource_multiplier
) {
  let [arl, greylisted] = get_account_cpu_limit_ex(name, greylist_limit);
  return { arl, greylisted };
}

function get_account_cpu_limit_ex(
  name: String,
  greylist_limit: number
): [account_resource_limit, boolean] {
  const usage = resource_usage_db.find((x) => x.owner === name);
  if (!usage) throw new Error(`Account ${name} does not exist`);
  let arl: account_resource_limit = {
    used: -1,
    available: -1,
    max: -1,
  };
  let greylisted: boolean = false;
  let { ram_bytes: x, net_weight: y, cpu_weight } = get_account_limits(name);
  if (cpu_weight < 0 || state.total_cpu_weight == 0) {
    return [arl, greylisted];
  }

  let window_size = JSBI.BigInt(config.account_cpu_usage_average_window);

  let virtual_cpu_capacity_in_window = window_size;
  if (greylist_limit < constant.maximum_elastic_resource_multiplier) {
    let greylisted_virtual_cpu_limit =
      config.cpu_limit_parameters.max * greylist_limit;
    if (greylisted_virtual_cpu_limit < state.virtual_cpu_limit) {
      virtual_cpu_capacity_in_window = JSBI.multiply(
        virtual_cpu_capacity_in_window,
        JSBI.BigInt(greylisted_virtual_cpu_limit)
      );
      greylisted = true;
    } else {
      virtual_cpu_capacity_in_window = JSBI.multiply(
        virtual_cpu_capacity_in_window,
        JSBI.BigInt(state.virtual_cpu_limit)
      );
    }
  } else {
    virtual_cpu_capacity_in_window = JSBI.multiply(
      virtual_cpu_capacity_in_window,
      JSBI.BigInt(state.virtual_cpu_limit)
    );
  }

  let user_weight = JSBI.BigInt(cpu_weight);
  let all_user_weight = JSBI.BigInt(state.total_cpu_weight);

  let max_user_use_in_window = JSBI.divide(
    JSBI.multiply(virtual_cpu_capacity_in_window, user_weight),
    all_user_weight
  );
  let cpu_used_in_window = integer_divide_ceil(
    JSBI.multiply(JSBI.BigInt(usage?.cpu_usage.value_ex), window_size),
    JSBI.BigInt(constant.rate_limiting_precision)
  );

  if (max_user_use_in_window <= cpu_used_in_window) arl.available = 0;
  else
    arl.available = Number(
      JSBI.subtract(max_user_use_in_window, cpu_used_in_window)
    );

  arl.used = Number(cpu_used_in_window);
  arl.max = Number(max_user_use_in_window);
  return [arl, greylisted];
}

function get_account_net_limit_ex(
  name: String,
  greylist_limit: number
): [account_resource_limit, boolean] {
  const usage = resource_usage_db.find((x) => x.owner === name);
  if (!usage) throw new Error(`Account ${name} does not exist`);
  let arl: account_resource_limit = {
    used: -1,
    available: -1,
    max: -1,
  };
  let greylisted: boolean = false;
  let { ram_bytes: x, net_weight, cpu_weight: y } = get_account_limits(name);

  if (net_weight < 0 || state.total_net_weight == 0) {
    return [arl, false];
  }

  let window_size = JSBI.BigInt(config.account_net_usage_average_window);

  let virtual_network_capacity_in_window = window_size;
  if (greylist_limit < constant.maximum_elastic_resource_multiplier) {
    let greylisted_virtual_net_limit =
      config.net_limit_parameters.max * greylist_limit;
    if (greylisted_virtual_net_limit < state.virtual_net_limit) {
      virtual_network_capacity_in_window = JSBI.multiply(
        virtual_network_capacity_in_window,
        JSBI.BigInt(greylisted_virtual_net_limit)
      );
      greylisted = true;
    } else {
      virtual_network_capacity_in_window = JSBI.multiply(
        virtual_network_capacity_in_window,
        JSBI.BigInt(state.virtual_net_limit)
      );
    }
  } else {
    virtual_network_capacity_in_window = JSBI.multiply(
      virtual_network_capacity_in_window,
      JSBI.BigInt(state.virtual_net_limit)
    );
  }

  let user_weight = JSBI.BigInt(net_weight);
  let all_user_weight = JSBI.BigInt(state.total_net_weight);

  let max_user_use_in_window = JSBI.divide(
    JSBI.multiply(virtual_network_capacity_in_window, user_weight),
    all_user_weight
  );
  let net_used_in_window = integer_divide_ceil(
    JSBI.multiply(JSBI.BigInt(usage.net_usage.value_ex), window_size),
    JSBI.BigInt(constant.rate_limiting_precision)
  );

  if (max_user_use_in_window <= net_used_in_window) arl.available = 0;
  else
    arl.available = Number(
      JSBI.subtract(max_user_use_in_window, net_used_in_window)
    );

  arl.used = Number(net_used_in_window);
  arl.max = Number(max_user_use_in_window);
  return [arl, greylisted];
}

export function get_account_limits(account: String) {
  let ram_bytes: number;
  let net_weight: number;
  let cpu_weight: number;
  const pending_buo = resource_limits_db.find(
    (x) => x.owner === account && x.pending === true
  );
  if (pending_buo) {
    ram_bytes = pending_buo.ram_bytes;
    net_weight = pending_buo.net_weight;
    cpu_weight = pending_buo.cpu_weight;
  } else {
    const buo = resource_limits_db.find(
      (x) => x.owner === account && x.pending === false
    );
    if (!buo) throw new Error(`Account ${account} limit not found`);
    ram_bytes = buo.ram_bytes;
    net_weight = buo.net_weight;
    cpu_weight = buo.cpu_weight;
  }
  return { ram_bytes, net_weight, cpu_weight };
}
