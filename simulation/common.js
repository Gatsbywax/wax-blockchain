function EOS_ASSERT(test, type, message) {
  if(!test) {
    throw new Error(`EOS_ASSERTION ${type}: ${message}`)
  }
}

function static_assert(test, message) {
  if(!test) {
    throw new Error(`static_assert: ${message}`)
  }
}

const rate_limiting_state_inconsistent = 'rate_limiting_state_inconsistent';
const resource_limit_exception = 'resource_limit_exception';

module.exports = {
  EOS_ASSERT,
  static_assert,
  rate_limiting_state_inconsistent
}
