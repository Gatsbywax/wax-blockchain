import JSBI from "jsbi";
import {
  elastic_limit_parameters,
  resource_limits_config_object,
  resource_limits_state_object,
  resource_limits_object,
  resource_usage_object,
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
} from "./common";
const config = new resource_limits_config_object();
const state = new resource_limits_state_object(
  config.cpu_limit_parameters.max,
  config.net_limit_parameters.max
);
const account_limits: resource_limits_object[] = [];
const account_usages: resource_usage_object[] = [];

export function update_elastic_limit(
  current_limit: number,
  average_usage: number,
  params: elastic_limit_parameters
) {
  let result = current_limit;
  if (average_usage > params.target) {
    result = result * params.contract_rate.d;
  } else {
    result = result * params.expand_rate.d;
  }
  return Math.min(
    Math.max(result, params.max),
    params.max * params.max_multiplier
  );
}

export function initialize_account(account: String) {
  let limits = new resource_limits_object(account);
  let usage = new resource_usage_object(account);
  account_limits.push(limits);
  account_usages.push(usage);
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
    const usage = account_usages.find((x) => x.owner === a);
    usage?.net_usage.add(0, time_slot, config.account_net_usage_average_window);
    usage?.cpu_usage.add(0, time_slot, config.account_net_usage_average_window);
    console.log("usage", usage);
  }
}

export function add_transaction_usage(
  accounts: String[],
  cpu_usage: number,
  net_usage: number,
  time_slot: number
) {
  for (let a of accounts) {
    const usage = account_usages.find((x) => x.owner === a);

    let { ram_bytes: unused, net_weight, cpu_weight } = get_account_limits(a);
    usage?.net_usage.add(
      net_usage,
      time_slot,
      config.account_net_usage_average_window
    );
    usage?.cpu_usage.add(
      net_usage,
      time_slot,
      config.account_net_usage_average_window
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

export function get_account_limits(account: String) {
  let ram_bytes: number;
  let net_weight: number;
  let cpu_weight: number;
  const pending_buo = account_limits.find(
    (x) => x.owner === account && x.pending === true
  );
  if (pending_buo) {
    ram_bytes = pending_buo.ram_bytes;
    net_weight = pending_buo.net_weight;
    cpu_weight = pending_buo.cpu_weight;
  } else {
    const buo = account_limits.find(
      (x) => x.owner === account && x.pending === false
    );
    if (!buo) throw new Error(`Account ${account} limit not found`);
    ram_bytes = buo.ram_bytes;
    net_weight = buo.net_weight;
    cpu_weight = buo.cpu_weight;
  }
  return { ram_bytes, net_weight, cpu_weight };
}
