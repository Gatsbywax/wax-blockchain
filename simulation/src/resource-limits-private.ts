import {
  EOS_ASSERT,
  EOS_PERCENT,
  static_assert,
  rate_limiting_state_inconsistent,
  resource_limit_exception,
} from "./common";
import * as constant from "./config";
import JSBI from "jsbi";

const Precision = constant.rate_limiting_precision;

function integer_divide_ceil(num: JSBI, den: JSBI) {
  return JSBI.add(
    JSBI.divide(num, den),
    JSBI.greaterThan(JSBI.remainder(num, den), JSBI.BigInt(0))
      ? JSBI.BigInt(1)
      : JSBI.BigInt(0)
  );
}

const max_raw_value = Number.MAX_SAFE_INTEGER / Precision;

export class Ratio {
  n: number;
  d: number;
  constructor(n: number, d: number) {
    this.n = n;
    this.d = d;
  }

  multiple(x: number) {
    return JSBI.toNumber(
      JSBI.divide(
        JSBI.multiply(JSBI.BigInt(x), JSBI.BigInt(this.n)),
        JSBI.BigInt(this.d)
      )
    );
  }

  equals(rhs: Ratio) {
    return this.n === rhs.n && this.d === rhs.d;
  }
}

function make_ratio(n: number, d: number) {
  return new Ratio(n, d);
}

export class elastic_limit_parameters {
  target: number;
  max: number;
  periods: number;
  max_multiplier: number;
  contract_rate: Ratio;
  expand_rate: Ratio;
  constructor(
    target: number,
    max: number,
    periods: number,
    max_multiplier: number,
    contract_rate: Ratio,
    expand_rate: Ratio
  ) {
    this.target = target; // the desired usage
    this.max = max; // the maximum usage
    this.periods = periods; // the number of aggregation periods that contribute to the average usage

    this.max_multiplier = max_multiplier; // the multiplier by which virtual space can oversell usage when uncongested
    this.contract_rate = contract_rate; // the rate at which a congested resource contracts its limit
    this.expand_rate = expand_rate; // the rate at which an uncongested resource expands its limits
  }

  validate() {
    EOS_ASSERT(
      this.periods > 0,
      resource_limit_exception,
      "elastic limit parameter 'periods' cannot be zero"
    );
    EOS_ASSERT(
      this.contract_rate.d > 0,
      resource_limit_exception,
      "elastic limit parameter 'contract_rate' is not a well-defined ratio"
    );
    EOS_ASSERT(
      this.expand_rate.d > 0,
      resource_limit_exception,
      "elastic limit parameter 'expand_rate' is not a well-defined ratio"
    );
  } // throws if the parameters do not satisfy basic sanity checks

  equals(rhs: this) {
    return (
      this.target === rhs.target &&
      this.max === rhs.max &&
      this.periods === rhs.periods &&
      this.max_multiplier === rhs.max_multiplier &&
      this.contract_rate.equals(rhs.contract_rate) &&
      this.expand_rate.equals(rhs.expand_rate)
    );
  }
}

export class exponential_moving_average_accumulator {
  static instanceId = 0;

  last_ordinal: number; ///< The ordinal of the last period which has contributed to the average
  value_ex: number; ///< The current average pre-multiplied by Precision
  consumed: number; ///< The last periods average + the current periods contribution so far
  instanceId: number;

  constructor() {
    this.last_ordinal = 0; ///< The ordinal of the last period which has contributed to the average
    this.value_ex = 0; ///< The current average pre-multiplied by Precision
    this.consumed = 0; ///< The last periods average + the current periods contribution so far
    this.instanceId = exponential_moving_average_accumulator.instanceId++;
  }

  toString() {
    return `EMAC ${this.instanceId} {last_ordinal = ${
      this.last_ordinal
    }, value_ex = ${this.value_ex}, average = ${this.average()}, consumed = ${
      this.consumed
    }}`;
  }

  print() {
    console.log(this.toString());
  }

  /**
   * return the average value
   */
  average() {
    return JSBI.toNumber(
      integer_divide_ceil(JSBI.BigInt(this.value_ex), JSBI.BigInt(Precision))
    );
  }

  add(units: number, ordinal: number, window_size: number) {
    // check for some numerical limits before doing any state mutations
    EOS_ASSERT(
      units <= max_raw_value,
      rate_limiting_state_inconsistent,
      "Usage exceeds maximum value representable after extending for precision"
    );
    EOS_ASSERT(
      Number.MAX_SAFE_INTEGER - this.consumed >= units,
      rate_limiting_state_inconsistent,
      "Overflow in tracked usage when adding usage!"
    );
    let value_ex_contrib = JSBI.toNumber(
      integer_divide_ceil(
        JSBI.multiply(JSBI.BigInt(units), JSBI.BigInt(Precision)),
        JSBI.BigInt(window_size)
      )
    );
    // console.log("value_ex_contrib: ", value_ex_contrib)
    EOS_ASSERT(
      Number.MAX_SAFE_INTEGER - this.value_ex >= value_ex_contrib,
      rate_limiting_state_inconsistent,
      "Overflow in accumulated value when adding usage!"
    );

    if (this.last_ordinal != ordinal) {
      EOS_ASSERT(
        ordinal > this.last_ordinal,
        resource_limit_exception,
        "new ordinal cannot be less than the previous ordinal"
      );
      if (this.last_ordinal + window_size > ordinal) {
        const delta = ordinal - this.last_ordinal; // clearly 0 < delta < window_size
        // console.log("delta: ", delta)
        const decay = make_ratio(window_size - delta, window_size);
        // console.log("decay: ", decay)
        this.value_ex = decay.multiple(this.value_ex);
        // console.log("this.value_ex: ", this.value_ex)
      } else {
        this.value_ex = 0;
      }

      this.last_ordinal = ordinal;
      this.consumed = this.average();
    }

    this.consumed += units;
    this.value_ex += value_ex_contrib;
  }
}

type usage_accumulator = exponential_moving_average_accumulator;

/**
 * Every account that authorizes a transaction is billed for the full size of that transaction. This object
 * tracks the average usage of that account.
 */

export class resource_limits_object {
  static instanceId = 0;
  id: number;
  owner: String;
  pending: boolean;
  net_weight: number;
  cpu_weight: number;
  ram_bytes: number;
  constructor(
    owner: String,
    pending: boolean = false,
    net_weight: number = -1,
    cpu_weight: number = -1,
    ram_bytes: number = -1
  ) {
    this.id = resource_limits_object.instanceId;
    this.owner = owner;
    this.pending = pending;

    this.net_weight = net_weight;
    this.cpu_weight = cpu_weight;
    this.ram_bytes = ram_bytes;
  }
}

export class resource_usage_object {
  static instanceId = 0;
  id: number;
  owner: String;
  net_usage: usage_accumulator;
  cpu_usage: usage_accumulator;
  ram_usage: number;
  constructor(owner: String) {
    this.id = resource_usage_object.instanceId++;
    this.owner = owner;

    this.net_usage = new exponential_moving_average_accumulator();
    this.cpu_usage = new exponential_moving_average_accumulator();
    this.ram_usage = 0;
  }
}

export class resource_limits_config_object {
  static instanceId = 0;
  id: number;
  cpu_limit_parameters: elastic_limit_parameters;
  net_limit_parameters: elastic_limit_parameters;
  account_cpu_usage_average_window: number;
  account_net_usage_average_window: number;
  constructor() {
    this.id = resource_limits_config_object.instanceId;

    static_assert(
      constant.block_interval_ms > 0,
      "constant.block_interval_ms must be positive"
    );
    static_assert(
      constant.block_cpu_usage_average_window_ms >= constant.block_interval_ms,
      "constant.block_cpu_usage_average_window_ms cannot be less than constant.block_interval_ms"
    );
    static_assert(
      constant.block_size_average_window_ms >= constant.block_interval_ms,
      "constant.block_size_average_window_ms cannot be less than constant.block_interval_ms"
    );

    this.cpu_limit_parameters = new elastic_limit_parameters(
      EOS_PERCENT(
        constant.default_max_block_cpu_usage,
        constant.default_target_block_cpu_usage_pct
      ),
      constant.default_max_block_cpu_usage,
      constant.block_cpu_usage_average_window_ms / constant.block_interval_ms,
      1000,
      make_ratio(99, 100),
      make_ratio(1000, 999)
    );
    this.net_limit_parameters = new elastic_limit_parameters(
      EOS_PERCENT(
        constant.default_max_block_net_usage,
        constant.default_target_block_net_usage_pct
      ),
      constant.default_max_block_net_usage,
      constant.block_size_average_window_ms / constant.block_interval_ms,
      1000,
      make_ratio(99, 100),
      make_ratio(1000, 999)
    );

    this.account_cpu_usage_average_window =
      constant.account_cpu_usage_average_window_ms / constant.block_interval_ms;
    this.account_net_usage_average_window =
      constant.account_net_usage_average_window_ms / constant.block_interval_ms;
  }
  static getInstance(instanceId: number) {
    return;
  }
  equals(rhs: this) {
    return (
      this.id === rhs.id &&
      this.cpu_limit_parameters === rhs.cpu_limit_parameters &&
      this.net_limit_parameters === rhs.net_limit_parameters &&
      this.account_cpu_usage_average_window ===
        rhs.account_cpu_usage_average_window &&
      this.account_net_usage_average_window ===
        rhs.account_net_usage_average_window
    );
  }
}

export class resource_limits_state_object {
  static instanceId = 0;
  id: number;
  /**
   * Track the average netusage for blocks
   */
  average_block_net_usage: usage_accumulator;

  /**
   * Track the average cpu usage for blocks
   */
  average_block_cpu_usage: usage_accumulator;

  pending_net_usage: number;
  pending_cpu_usage: number;

  total_net_weight: number;
  total_cpu_weight: number;
  total_ram_bytes: number;

  virtual_net_limit: number;

  /**
   *  Increases when average_bloc
   */
  virtual_cpu_limit: number;
  constructor(virtual_net_limit: number, virtual_cpu_limit: number) {
    this.id = resource_limits_state_object.instanceId;

    /**
     * Track the average netusage for blocks
     */
    this.average_block_net_usage = new exponential_moving_average_accumulator();

    /**
     * Track the average cpu usage for blocks
     */
    this.average_block_cpu_usage = new exponential_moving_average_accumulator();

    this.pending_net_usage = 0;
    this.pending_cpu_usage = 0;

    this.total_net_weight = 0;
    this.total_cpu_weight = 0;
    this.total_ram_bytes = 0;

    /**
     * The virtual number of bytes that would be consumed over blocksize_average_window_ms
     * if all blocks were at their maximum virtual size. This is virtual because the
     * real maximum block is less, this virtual number is only used for rate limiting users.
     *
     * It's lowest possible value is max_block_size * blocksize_average_window_ms / block_interval
     * It's highest possible value is constant.maximum_elastic_resource_multiplier (1000) times its lowest possible value
     *
     * This means that the most an account can consume during idle periods is 1000x the bandwidth
     * it is gauranteed under congestion.
     *
     * Increases when average_block_size < target_block_size, decreases when
     * average_block_size > target_block_size, with a cap at 1000x max_block_size
     * and a floor at max_block_size;
     **/
    this.virtual_net_limit = virtual_net_limit;

    /**
     *  Increases when average_bloc
     */
    this.virtual_cpu_limit = virtual_cpu_limit;
  }

  update_virtual_net_limit(cfg: resource_limits_config_object) {
    this.virtual_net_limit = update_elastic_limit(
      this.virtual_net_limit,
      this.average_block_net_usage.average(),
      cfg.net_limit_parameters
    );
  }
  update_virtual_cpu_limit(cfg: resource_limits_config_object) {
    this.virtual_cpu_limit = update_elastic_limit(
      this.virtual_cpu_limit,
      this.average_block_cpu_usage.average(),
      cfg.cpu_limit_parameters
    );
  }
}

export interface account_resource_limit {
  used: number; ///< quantity used in current window
  available: number; ///< quantity available in current window (based upon fractional reserve)
  max: number; ///< max per window under current congestion
}

export function update_elastic_limit(
  current_limit: number,
  average_usage: number,
  params: elastic_limit_parameters
) {
  let result = current_limit;
  if (average_usage > params.target) {
    result = JSBI.toNumber(
      JSBI.divide(
        JSBI.multiply(JSBI.BigInt(result), JSBI.BigInt(params.contract_rate.n)),
        JSBI.BigInt(params.contract_rate.d)
      )
    );
  } else {
    result = JSBI.toNumber(
      JSBI.divide(
        JSBI.multiply(JSBI.BigInt(result), JSBI.BigInt(params.expand_rate.n)),
        JSBI.BigInt(params.expand_rate.d)
      )
    );
  }
  return Math.min(
    Math.max(result, params.max),
    params.max * params.max_multiplier
  );
}
