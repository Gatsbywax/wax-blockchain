const {EOS_ASSERT, static_assert, rate_limiting_state_inconsistent, resource_limit_exception} = require('./common.js');
const config = require('./config.js');

const Precision = 1;

function integer_divide_ceil(num, den) {
  return num / den;
  // return Math.floor(num / den);
}

const max_raw_value = Number.MAX_SAFE_INTEGER / Precision;


class Ratio {
  constructor(n, d) {
    this.n = n;
    this.d = d;
  }

  times(x) {
    return x * integer_divide_ceil(this.n, this.d);
  }

  equals(rhs) {
    return this.n === rhs.n && this.d === rhs.d;
  }
}

function make_ratio(n, d) {
   return new Ratio(n, d);
}

class elastic_limit_parameters {
  constructor() {
    this.target = 0;           // the desired usage
    this.max = 0;              // the maximum usage
    this.periods = 0;          // the number of aggregation periods that contribute to the average usage

    this.max_multiplier = 0;   // the multiplier by which virtual space can oversell usage when uncongested
    this.contract_rate = make_ratio(0, 0);    // the rate at which a congested resource contracts its limit
    this.expand_rate = make_ratio(0, 0);       // the rate at which an uncongested resource expands its limits
  }

  validate() {
    EOS_ASSERT( periods > 0, resource_limit_exception, "elastic limit parameter 'periods' cannot be zero" );
    EOS_ASSERT( contract_rate.d > 0, resource_limit_exception, "elastic limit parameter 'contract_rate' is not a well-defined ratio" );
    EOS_ASSERT( expand_rate.d > 0, resource_limit_exception, "elastic limit parameter 'expand_rate' is not a well-defined ratio" );
  } // throws if the parameters do not satisfy basic sanity checks

  equals(rhs ) {
     return this.target === rhs.target && this.max === rhs.max && this.periods === rhs.periods && this.max_multiplier === rhs.max_multiplier && this.contract_rate.equals(rhs.contract_rate) && this.expand_rate.equals(rhs.expand_rate);
  }
};

class exponential_moving_average_accumulator
{
  static instanceId = 0;

   constructor() {
     this.last_ordinal = 0; ///< The ordinal of the last period which has contributed to the average
     this.value_ex = 0; ///< The current average pre-multiplied by Precision
     this.consumed = 0; ///< The last periods average + the current periods contribution so far
     this.instanceId = exponential_moving_average_accumulator.instanceId++;
   }

   toString() {
     return `EMAC ${this.instanceId} {last_ordinal = ${this.last_ordinal}, value_ex = ${this.value_ex}, average = ${this.average()}, consumed = ${this.consumed}}`
   }

   print() {
     console.log(this.toString());
   }

   /**
    * return the average value
    */
   average() {
      return integer_divide_ceil(this.value_ex, Precision);
   }

   add( units, ordinal, window_size /* must be positive */ )
   {
      // check for some numerical limits before doing any state mutations
      EOS_ASSERT(units <= max_raw_value, rate_limiting_state_inconsistent, "Usage exceeds maximum value representable after extending for precision");
      EOS_ASSERT(Number.MAX_SAFE_INTEGER - this.consumed >= units, rate_limiting_state_inconsistent, "Overflow in tracked usage when adding usage!");

      let value_ex_contrib = integer_divide_ceil(units * Precision, window_size);
      EOS_ASSERT(Number.MAX_SAFE_INTEGER - this.value_ex >= value_ex_contrib, rate_limiting_state_inconsistent, "Overflow in accumulated value when adding usage!");

      if( this.last_ordinal != ordinal ) {
         EOS_ASSERT( ordinal > this.last_ordinal, resource_limit_exception, "new ordinal cannot be less than the previous ordinal" );
         if( this.last_ordinal + window_size > ordinal ) {
            const delta = ordinal - this.last_ordinal; // clearly 0 < delta < window_size
            const decay = make_ratio(
                    window_size - delta,
                    window_size
            );

            this.value_ex = decay.times(this.value_ex);
         } else {
            value_ex = 0;
         }

         this.last_ordinal = ordinal;
         this.consumed = this.average();
      }

      this.consumed += units;
      this.value_ex += value_ex_contrib;
   }
}

const usage_accumulator = exponential_moving_average_accumulator;

/**
 * Every account that authorizes a transaction is billed for the full size of that transaction. This object
 * tracks the average usage of that account.
 */
class resource_limits_object {
   constructor() {
     this.id = null;
     this.owner = null;
     this.pending = false;

     this.net_weight = -1;
     this.cpu_weight = -1;
     this.ram_bytes = -1;
   }
};

class resource_usage_object {
   constructor() {
     this.id = null;
     this.owner = null;

     this.net_usage = new usage_accumulator();
     this.cpu_usage = new usage_accumulator();
     this.ram_usage = 0;
   }
};

class resource_limits_config_object {
  constructor() {
    this.id = null;

    static_assert( config.block_interval_ms > 0, "config.block_interval_ms must be positive" );
    static_assert( config.block_cpu_usage_average_window_ms >= config.block_interval_ms,
                  "config.block_cpu_usage_average_window_ms cannot be less than config.block_interval_ms" );
    static_assert( config.block_size_average_window_ms >= config.block_interval_ms,
                  "config.block_size_average_window_ms cannot be less than config.block_interval_ms" );


    this.cpu_limit_parameters = new elastic_limit_parameters(EOS_PERCENT(config.default_max_block_cpu_usage, config.default_target_block_cpu_usage_pct), config.default_max_block_cpu_usage, config.block_cpu_usage_average_window_ms / config.block_interval_ms, 1000, {99, 100}, {1000, 999});
    this.net_limit_parameters = new elastic_limit_parameters(EOS_PERCENT(config.default_max_block_net_usage, config.default_target_block_net_usage_pct), config.default_max_block_net_usage, config.block_size_average_window_ms / config.block_interval_ms, 1000, {99, 100}, {1000, 999});

    this.account_cpu_usage_average_window = config.account_cpu_usage_average_window_ms / config.block_interval_ms;
    this.account_net_usage_average_window = config.account_net_usage_average_window_ms / config.block_interval_ms;
  }

  equals(rhs) {
    return this.id = rhs.id && this.cpu_limit_parameters = rhs.cpu_limit_parameters && this.net_limit_parameters = rhs.net_limit_parameters && this.account_cpu_usage_average_window = rhs.account_cpu_usage_average_window && this.account_net_usage_average_window = rhs.account_net_usage_average_window;
  }
};

class resource_limits_state_object {
   constructor() {
     this.id = null;

     /**
     * Track the average netusage for blocks
     */
     this.average_block_net_usage = new usage_accumulator();

     /**
     * Track the average cpu usage for blocks
     */
     this.average_block_cpu_usage = new usage_accumulator();

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
      * It's highest possible value is config.maximum_elastic_resource_multiplier (1000) times its lowest possible value
      *
      * This means that the most an account can consume during idle periods is 1000x the bandwidth
      * it is gauranteed under congestion.
      *
      * Increases when average_block_size < target_block_size, decreases when
      * average_block_size > target_block_size, with a cap at 1000x max_block_size
      * and a floor at max_block_size;
      **/
     this.virtual_net_limit = 0;

     /**
      *  Increases when average_bloc
      */
     this.virtual_cpu_limit = 0;
   }

   update_virtual_net_limit( cfg ) {}
   update_virtual_cpu_limit( cfg ) {}
};

module.exports = {
  Precision,
  integer_divide_ceil,
  exponential_moving_average_accumulator
}
