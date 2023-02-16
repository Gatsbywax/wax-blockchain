import * as constant from "../src/config";
import JSBI from "jsbi";
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
} from "../src/common";

import {
  initialize_database,
  initialize_account,
  set_account_limits,
  process_account_limit_updates,
  get_virtual_block_cpu_limit,
  add_transaction_usage,
  process_block_usage,
  get_virtual_block_net_limit,
  get_account_cpu_limit,
  add_pending_ram_usage,
  verify_account_ram_usage,
} from "../src/resource-limits-common";

function expected_elastic_iterations(
  from: number,
  to: number,
  rate_num: number,
  rate_den: number
): number {
  let result = 0;
  let cur = from;

  while ((from < to && cur < to) || (from > to && cur > to)) {
    cur = JSBI.toNumber(
      JSBI.divide(
        JSBI.multiply(JSBI.BigInt(cur), JSBI.BigInt(rate_num)),
        JSBI.BigInt(rate_den)
      )
    );
    result += 1;
  }

  return result;
}

function expected_exponential_average_iterations(
  from: number,
  to: number,
  value: number,
  window_size: number
): number {
  let result = 0;
  let cur = from;

  while ((from < to && cur < to) || (from > to && cur > to)) {
    cur = JSBI.toNumber(
      JSBI.divide(
        JSBI.multiply(JSBI.BigInt(cur), JSBI.BigInt(window_size - 1)),
        JSBI.BigInt(window_size)
      )
    );
    cur += JSBI.toNumber(
      JSBI.divide(JSBI.BigInt(value), JSBI.BigInt(window_size))
    );
    result += 1;
  }

  return result;
}

describe("resource_limits_test", () => {
  beforeEach(() => {
    initialize_database();
  });
  it("elastic_cpu_relax_contract", () => {
    initialize_database();
    let desired_virtual_limit =
      constant.default_max_block_cpu_usage *
      constant.maximum_elastic_resource_multiplier;
    let expected_relax_iterations = expected_elastic_iterations(
      constant.default_max_block_cpu_usage,
      desired_virtual_limit,
      1000,
      999
    );
    // this is enough iterations for the average to reach/exceed the target (triggering congestion handling) and then the iterations to contract down to the min
    // subtracting 1 for the iteration that pulls double duty as reaching/exceeding the target and starting congestion handling
    let expected_contract_iterations =
      expected_exponential_average_iterations(
        0,
        EOS_PERCENT(
          constant.default_max_block_cpu_usage,
          constant.default_target_block_cpu_usage_pct
        ),
        constant.default_max_block_cpu_usage,
        constant.block_cpu_usage_average_window_ms / constant.block_interval_ms
      ) +
      expected_elastic_iterations(
        desired_virtual_limit,
        constant.default_max_block_cpu_usage,
        99,
        100
      ) -
      1;
    const account = "account1";
    initialize_account(account);
    set_account_limits(account, -1, -1, -1);
    process_account_limit_updates();
    // relax from the starting state (congested) to the idle state as fast as possible
    let iterations = 0;
    while (
      get_virtual_block_cpu_limit() < desired_virtual_limit &&
      iterations <= expected_relax_iterations
    ) {
      add_transaction_usage([account], 0, 0, iterations);
      process_block_usage(iterations++);
    }
    expect(iterations).toEqual(expected_relax_iterations);
    expect(get_virtual_block_cpu_limit()).toEqual(desired_virtual_limit);
    // push maximum resources to go from idle back to congested as fast as possible
    while (
      get_virtual_block_cpu_limit() > constant.default_max_block_cpu_usage &&
      iterations <= expected_relax_iterations + expected_contract_iterations
    ) {
      add_transaction_usage(
        [account],
        constant.default_max_block_cpu_usage,
        0,
        iterations
      );
      process_block_usage(iterations++);
    }
    expect(iterations).toEqual(
      expected_relax_iterations + expected_contract_iterations
    );
    expect(get_virtual_block_cpu_limit()).toEqual(
      constant.default_max_block_cpu_usage
    );
  });

  it("elastic_net_relax_contract", () => {
    initialize_database();
    let desired_virtual_limit =
      constant.default_max_block_net_usage *
      constant.maximum_elastic_resource_multiplier;
    let expected_relax_iterations = expected_elastic_iterations(
      constant.default_max_block_net_usage,
      desired_virtual_limit,
      1000,
      999
    );
    // this is enough iterations for the average to reach/exceed the target (triggering congestion handling) and then the iterations to contract down to the min
    // subtracting 1 for the iteration that pulls double duty as reaching/exceeding the target and starting congestion handling
    let expected_contract_iterations =
      expected_exponential_average_iterations(
        0,
        EOS_PERCENT(
          constant.default_max_block_net_usage,
          constant.default_target_block_net_usage_pct
        ),
        constant.default_max_block_net_usage,
        constant.block_size_average_window_ms / constant.block_interval_ms
      ) +
      expected_elastic_iterations(
        desired_virtual_limit,
        constant.default_max_block_net_usage,
        99,
        100
      ) -
      1;
    const account = "account2";
    initialize_account(account);
    set_account_limits(account, -1, -1, -1);
    process_account_limit_updates();
    const current_time_seconds = (new Date().getTime() / 1000).toFixed();
    // relax from the starting state (congested) to the idle state as fast as possible
    let iterations = 0;
    while (
      get_virtual_block_net_limit() < desired_virtual_limit &&
      iterations <= expected_relax_iterations
    ) {
      add_transaction_usage(
        [account],
        0,
        0,
        iterations + parseInt(current_time_seconds)
      );
      process_block_usage(iterations++ + parseInt(current_time_seconds));
    }
    expect(iterations).toEqual(expected_relax_iterations);
    expect(get_virtual_block_net_limit()).toEqual(desired_virtual_limit);
    // push maximum resources to go from idle back to congested as fast as possible
    while (
      get_virtual_block_net_limit() > constant.default_max_block_net_usage &&
      iterations <= expected_relax_iterations + expected_contract_iterations
    ) {
      add_transaction_usage(
        [account],
        0,
        constant.default_max_block_net_usage,
        iterations + parseInt(current_time_seconds)
      );
      process_block_usage(iterations++ + parseInt(current_time_seconds));
    }
    expect(iterations).toEqual(
      expected_relax_iterations + expected_contract_iterations
    );
    expect(get_virtual_block_net_limit()).toEqual(
      constant.default_max_block_net_usage
    );
  });

  it.skip("weighted_capacity_cpu", () => {
    const weights: number[] = [234, 511, 672, 800, 1213];
    let total = 0;
    for (const weight of weights) {
      total += weight;
    }
    console.log("total: ", total);
    let expected_limits = new Array();
    for (let i = 0; i < weights.length; i++) {
      expected_limits.push(
        JSBI.toNumber(
          JSBI.divide(
            JSBI.multiply(
              JSBI.BigInt(constant.default_max_block_cpu_usage),
              JSBI.BigInt(weights[i])
            ),
            JSBI.BigInt(total)
          )
        )
      );
    }
    console.log("expected_limits: ", expected_limits);
    for (let i = 0; i < weights.length; i++) {
      const account = i + 100 + "";
      initialize_account(account);
      set_account_limits(account, -1, -1, weights[i]);
    }
    process_account_limit_updates();

    for (let i = 0; i < weights.length; i++) {
      const account = i + 100 + "";
      expect(get_account_cpu_limit(account).arl.available).toEqual(
        expected_limits[i]
      );
    }
  });
  it("enforce_block_limits_cpu", async () => {
    const account = "account3";
    initialize_account(account);
    set_account_limits(account, -1, -1, -1);
    process_account_limit_updates();
    const increment = 1000;
    const expected_iterations = JSBI.toNumber(
      JSBI.divide(
        JSBI.BigInt(constant.default_max_block_cpu_usage),
        JSBI.BigInt(increment)
      )
    );
    for (let i = 0; i < expected_iterations; i++) {
      add_transaction_usage([account], increment, 0, 0);
    }
    expect(() =>
      add_transaction_usage([account], increment, 0, 0)
    ).toThrowError("Block has insufficient cpu resources");
  });

  it("enforce_block_limits_net", async () => {
    const account = "account4";
    initialize_account(account);
    set_account_limits(account, -1, -1, -1);
    process_account_limit_updates();
    const increment = 1000;
    const expected_iterations = JSBI.toNumber(
      JSBI.divide(
        JSBI.BigInt(constant.default_max_block_net_usage),
        JSBI.BigInt(increment)
      )
    );

    for (let i = 0; i < expected_iterations; i++) {
      add_transaction_usage([account], 0, increment, 0);
    }

    expect(() =>
      add_transaction_usage([account], 0, increment, 0)
    ).toThrowError("Block has insufficient net resources");
  });

  it("enforce_account_ram_limit", async () => {
    const limit = 1000;
    const increment = 77;
    const expected_iterations = JSBI.toNumber(
      JSBI.divide(JSBI.BigInt(limit + increment - 1), JSBI.BigInt(increment))
    );
    const account = "account5";
    initialize_account(account);
    set_account_limits(account, limit, -1, -1);
    process_account_limit_updates();

    for (let i = 0; i < expected_iterations - 1; i++) {
      add_pending_ram_usage(account, increment);
      verify_account_ram_usage(account);
    }
    add_pending_ram_usage(account, increment);
    expect(() => verify_account_ram_usage(account)).toThrowError(
      "ram_usage_exceeded"
    );
  });

  it("enforce_account_ram_limit_underflow", async () => {
    const account = "account6";
    initialize_account(account);
    set_account_limits(account, 100, -1, -1);
    verify_account_ram_usage(account);
    process_account_limit_updates();
    expect(() => add_pending_ram_usage(account, -101)).toThrowError(
      "transaction_exception: Ram usage delta would underflow"
    );
  });

  it("enforce_account_ram_limit_overflow", async () => {
    const account = "account7";
    initialize_account(account);
    set_account_limits(account, JSBI.toNumber(MaxUint64), -1, -1);
    verify_account_ram_usage(account);
    process_account_limit_updates();
    add_pending_ram_usage(
      account,
      JSBI.toNumber(JSBI.divide(MaxUint64, JSBI.BigInt(2)))
    );
    verify_account_ram_usage(account);
    add_pending_ram_usage(
      account,
      JSBI.toNumber(JSBI.divide(MaxUint64, JSBI.BigInt(2)))
    );
    verify_account_ram_usage(account);
    expect(() => add_pending_ram_usage(account, 2)).toThrowError(
      "transaction_exception: Ram usage delta would overflow UINT64_MAX"
    );
  });

  it("enforce_account_ram_commitment", async () => {
    const limit = 1000;
    const commit = 600;
    const increment = 77;
    const expected_iterations = JSBI.toNumber(
      JSBI.divide(
        JSBI.BigInt(limit - commit + increment - 1),
        JSBI.BigInt(increment)
      )
    );
    const account = "account8";
    initialize_account(account);
    set_account_limits(account, limit, -1, -1);
    process_account_limit_updates();
    add_pending_ram_usage(account, commit);
    verify_account_ram_usage(account);

    for (let idx = 0; idx < expected_iterations - 1; idx++) {
      set_account_limits(account, limit - increment * idx, -1, -1);
      verify_account_ram_usage(account);
      process_account_limit_updates();
    }
    set_account_limits(
      account,
      limit - increment * expected_iterations,
      -1,
      -1
    );
    expect(() => verify_account_ram_usage(account)).toThrowError(
      "ram_usage_exceeded"
    );
  });

  it("sanity_check", async () => {
    const total_staked_tokens = 10000000000000;
    const user_stake = 10000;
    const max_block_cpu = 200000; // us;
    const blocks_per_day = 2 * 60 * 60 * 24;
    const total_cpu_per_period = max_block_cpu * blocks_per_day;

    const congested_cpu_time_per_period =
      (total_cpu_per_period * user_stake) / total_staked_tokens;
    const uncongested_cpu_time_per_period =
      congested_cpu_time_per_period *
      constant.maximum_elastic_resource_multiplier;
    initialize_account("dan");
    initialize_account("everyone");
    set_account_limits("dan", 0, 0, user_stake);
    set_account_limits("everyone", 0, 0, total_staked_tokens - user_stake);
    process_account_limit_updates();

    // dan cannot consume more than 34 us per day
    expect(() => add_transaction_usage(["dan"], 35, 0, 1)).toThrowError(
      "tx_cpu_usage_exceeded"
    );
    // Ensure CPU usage is 0 by "waiting" for one day's worth of blocks to pass.
    add_transaction_usage(["dan"], 0, 0, 1 + blocks_per_day);

    // But dan should be able to consume up to 34 us per day.
    add_transaction_usage(["dan"], 34, 0, 2 + blocks_per_day);
  });
});
