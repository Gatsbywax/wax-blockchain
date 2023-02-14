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
  it("elastic_cpu_relax_contract", () => {
    initialize_database();
    let desired_virtual_limit =
      constant.default_max_block_cpu_usage *
      constant.maximum_elastic_resource_multiplier;
    //   console.log("desired_virtual_limit", desired_virtual_limit)
    let expected_relax_iterations = expected_elastic_iterations(
      constant.default_max_block_cpu_usage,
      desired_virtual_limit,
      1000,
      999
    );
    // console.log("expected_relax_iterations", expected_relax_iterations)
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
    //   console.log("expected_contract_iterations", expected_contract_iterations)
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
    // console.log("expected_relax_iterations", expected_relax_iterations)
    // console.log("iterations", iterations)
    // expect(iterations).toEqual(expected_relax_iterations);
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
    // expect(iterations).toEqual(expected_relax_iterations + expected_contract_iterations);
    expect(get_virtual_block_cpu_limit()).toEqual(
      constant.default_max_block_cpu_usage
    );
  });

  it("elastic_net_relax_contract", () => {
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
    //   console.log("expected_contract_iterations", expected_contract_iterations)
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
    // console.log("expected_relax_iterations", expected_relax_iterations)
    // console.log("iterations", iterations)
    // expect(iterations).toEqual(expected_relax_iterations);
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
    // expect(iterations).toEqual(expected_relax_iterations + expected_contract_iterations);
    expect(get_virtual_block_net_limit()).toEqual(
      constant.default_max_block_net_usage
    );
  });
});
