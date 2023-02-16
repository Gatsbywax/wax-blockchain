import * as config from "./config";
import JSBI from "jsbi";

export function EOS_ASSERT(test: boolean, type: String, ...messages: any) {
  if (!test) {
    let message = `EOS_ASSERTION ${type}:`;
    for (let m of messages) {
      message += ` ${m}`;
    }
    throw new Error(message);
  }
}

export function static_assert(test: boolean, message: String) {
  if (!test) {
    throw new Error(`static_assert: ${message}`);
  }
}

export function EOS_PERCENT(value: number, percentage: number) {
  return JSBI.toNumber(
    JSBI.divide(
      JSBI.multiply(JSBI.BigInt(value), JSBI.BigInt(percentage)),
      JSBI.BigInt(config.percent_100)
    )
  );
}
export const MaxUint64 = JSBI.BigInt("0xffffffffffffffff");

export function integer_divide_ceil(num: JSBI, den: JSBI) {
  return JSBI.add(
    JSBI.divide(num, den),
    JSBI.greaterThan(JSBI.remainder(num, den), JSBI.BigInt(0))
      ? JSBI.BigInt(1)
      : JSBI.BigInt(0)
  );
}

export const rate_limiting_state_inconsistent =
  "rate_limiting_state_inconsistent";
export const resource_limit_exception = "resource_limit_exception";
export const tx_cpu_usage_exceeded = "tx_cpu_usage_exceeded";
export const transaction_exception = "transaction_exception";
export const tx_net_usage_exceeded = "tx_net_usage_exceeded";
export const block_resource_exhausted = "block_resource_exhausted";
export const ram_usage_exceeded = "ram_usage_exceeded";
