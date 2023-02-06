function EOS_ASSERT(test, type, ...messages) {
  if(!test) {
    let message = `EOS_ASSERTION ${type}:`;
    for( let m of messages) {
      message += ` ${m}`;
    }
    throw new Error(message);
  }
}

function static_assert(test, message) {
  if(!test) {
    throw new Error(`static_assert: ${message}`)
  }
}

const rate_limiting_state_inconsistent = 'rate_limiting_state_inconsistent';
const resource_limit_exception = 'resource_limit_exception';
const tx_cpu_usage_exceeded = 'tx_cpu_usage_exceeded';
const transaction_exception = 'transaction_exception';

module.exports = {
  EOS_ASSERT,
  static_assert,
  rate_limiting_state_inconsistent,
  tx_cpu_usage_exceeded,
  transaction_exception
}
