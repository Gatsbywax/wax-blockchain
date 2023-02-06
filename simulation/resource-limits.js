const {EOS_ASSERT, tx_cpu_usage_exceeded, transaction_exception} = require('./common.js');
const {elastic_limit_parameters, resource_limits_object, resource_usage_object, resource_limits_config_object, resource_limits_state_object} = require('./resource-limits-private.js');

class account_resource_limit {
  constructor() {
    this.used = 0; ///< quantity used in current window
    this.available = 0; ///< quantity available in current window (based upon fractional reserve)
    this.max = 0; ///< max per window under current congestion
  }
};

class resource_limits_manager {
  constructor(db) {
    this.db = db
  }

  initialize_database() {
    this.db.accounts = {};
    this.db.block_params = {
      resource_limits_config_object: new resource_limits_config_object(),
      resource_limits_state_object: new resource_limits_state_object();
    };
  }

  initialize_account(account ) {
    this.db.accounts[account] = {
      bl: new resource_limits_object(),
      bu: new resource_usage_object(),
      ram_usage: 0
    };
  }

  void set_block_parameters(cpu_limit_parameters, net_limit_parameters ) {
    cpu_limit_parameters.validate();
    net_limit_parameters.validate();
    const config = db.block_params.resource_limits_config_object;
    if( config.cpu_limit_parameters.equals(cpu_limit_parameters) && config.net_limit_parameters.equals(net_limit_parameters) )
       return;
    config.cpu_limit_parameters = cpu_limit_parameters;
    config.net_limit_parameters = net_limit_parameters;
  }

  void update_account_usage( accounts , time_slot) {
    const config = db.block_params.resource_limits_config_object;

    for(let a of accounts) {
      let bu = this.get_resource_limits_object_by_owner(a).bu;
      bu.net_usage.add( 0, time_slot, config.account_net_usage_average_window );
      bu.cpu_usage.add( 0, time_slot, config.account_cpu_usage_average_window );
    }
  }

  void add_transaction_usage( accounts, cpu_usage, net_usage, ordinal ) {
    const config = db.block_params.resource_limits_config_object;
    const state = db.block_params.resource_limits_state_object;

    for(let a of accounts) {
      let bu = this.get_resource_limits_object_by_owner(a).bu;
      let {unused, net_weight, cpu_weight} = this.get_account_limits(a);
      bu.net_usage.add( net_usage, time_slot, config.account_net_usage_average_window );
      bu.cpu_usage.add( cpu_usage, time_slot, config.account_cpu_usage_average_window );

      if( cpu_weight >= 0 && state.total_cpu_weight > 0 ) {
         const window_size = config.account_cpu_usage_average_window;
         const virtual_network_capacity_in_window = state.virtual_cpu_limit * window_size;
         const cpu_used_in_window                 = (usage.cpu_usage.value_ex * window_size) / config::rate_limiting_precision;

         const user_weight     = cpu_weight;
         const all_user_weight = state.total_cpu_weight;

         const max_user_use_in_window = (virtual_network_capacity_in_window * user_weight) / all_user_weight;

         EOS_ASSERT( cpu_used_in_window <= max_user_use_in_window,
                     tx_cpu_usage_exceeded,
                     "authorizing account '${n}' has insufficient cpu resources for this transaction",
                     "n", a,
                     "cpu_used_in_window",cpu_used_in_window,
                     "max_user_use_in_window",max_user_use_in_window );
      }
    }
  }

  add_pending_ram_usage( account, ram_delta ) {
    if (ram_delta === 0) {
       return;
    }

    let usage = this.get_resource_limits_object_by_owner(a);


    EOS_ASSERT( ram_delta <= 0 || Number.MAX_SAFE_INTEGER - usage.ram_usage >= ram_delta, transaction_exception,
               "Ram usage delta would overflow UINT64_MAX");
    EOS_ASSERT(ram_delta >= 0 || usage.ram_usage >= (-ram_delta), transaction_exception,
               "Ram usage delta would underflow UINT64_MAX");

    usage.ram_usage += ram_delta;
  }

  get_resource_limits_object_by_owner(account) {
    return this.db.accounts[account];
  }

  verify_account_ram_usage( account ) {
    const {ram_bytes, net_weight, cpu_weight} = get_account_limits(account);
    let usage = this.get_resource_limits_object_by_owner(a];

    if( ram_bytes >= 0 ) {
       EOS_ASSERT( usage.ram_usage <= ram_bytes, ram_usage_exceeded,
                   "account ${account} has insufficient ram; needs ${needs} bytes has ${available} bytes",
                   "account", account, "needs",usage.ram_usage, "available",ram_bytes)              );
    }
  }

  /// set_account_limits returns true if new ram_bytes limit is more restrictive than the previously set one
  set_account_limits( account, ram_bytes, net_weight, cpu_weight) {
    //const auto& usage = _db.get<resource_usage_object,by_owner>( account );
    /*
     * Since we need to delay these until the next resource limiting boundary, these are created in a "pending"
     * state or adjusted in an existing "pending" state.  The chain controller will collapse "pending" state into
     * the actual state at the next appropriate boundary.
     */
    auto find_or_create_pending_limits = [&]() -> const resource_limits_object& {
       const auto* pending_limits = _db.find<resource_limits_object, by_owner>( boost::make_tuple(true, account) );
       if (pending_limits == nullptr) {
          const auto& limits = _db.get<resource_limits_object, by_owner>( boost::make_tuple(false, account));
          return _db.create<resource_limits_object>([&](resource_limits_object& pending_limits){
             pending_limits.owner = limits.owner;
             pending_limits.ram_bytes = limits.ram_bytes;
             pending_limits.net_weight = limits.net_weight;
             pending_limits.cpu_weight = limits.cpu_weight;
             pending_limits.pending = true;
          });
       } else {
          return *pending_limits;
       }
    };

    // update the users weights directly
    auto& limits = find_or_create_pending_limits();

    bool decreased_limit = false;

    if( ram_bytes >= 0 ) {

       decreased_limit = ( (limits.ram_bytes < 0) || (ram_bytes < limits.ram_bytes) );

       /*
       if( limits.ram_bytes < 0 ) {
          EOS_ASSERT(ram_bytes >= usage.ram_usage, wasm_execution_error, "converting unlimited account would result in overcommitment [commit=${c}, desired limit=${l}]", ("c", usage.ram_usage)("l", ram_bytes));
       } else {
          EOS_ASSERT(ram_bytes >= usage.ram_usage, wasm_execution_error, "attempting to release committed ram resources [commit=${c}, desired limit=${l}]", ("c", usage.ram_usage)("l", ram_bytes));
       }
       */
    }

    _db.modify( limits, [&]( resource_limits_object& pending_limits ){
       pending_limits.ram_bytes = ram_bytes;
       pending_limits.net_weight = net_weight;
       pending_limits.cpu_weight = cpu_weight;

       if (auto dm_logger = _get_deep_mind_logger()) {
          dm_logger->on_set_account_limits(pending_limits);
       }
    });

    return decreased_limit;
  }

  void get_account_limits( const account_name& account, int64_t& ram_bytes, int64_t& net_weight, int64_t& cpu_weight) const;

  bool is_unlimited_cpu( const account_name& account ) const;

  void process_account_limit_updates();
  void process_block_usage( uint32_t block_num );

  // accessors
  uint64_t get_total_cpu_weight() const;
  uint64_t get_total_net_weight() const;

  uint64_t get_virtual_block_cpu_limit() const;
  uint64_t get_virtual_block_net_limit() const;

  uint64_t get_block_cpu_limit() const;
  uint64_t get_block_net_limit() const;

  std::pair<int64_t, bool> get_account_cpu_limit( const account_name& name, uint32_t greylist_limit = config::maximum_elastic_resource_multiplier ) const;
  std::pair<int64_t, bool> get_account_net_limit( const account_name& name, uint32_t greylist_limit = config::maximum_elastic_resource_multiplier ) const;

  std::pair<account_resource_limit, bool> get_account_cpu_limit_ex( const account_name& name, uint32_t greylist_limit = config::maximum_elastic_resource_multiplier ) const;
  std::pair<account_resource_limit, bool> get_account_net_limit_ex( const account_name& name, uint32_t greylist_limit = config::maximum_elastic_resource_multiplier ) const;

  get_account_ram_usage( name ) {
    return this.get_resource_limits_object_by_owner(a).ram_usage;
  }

  chainbase::database&         _db;
  std::function<deep_mind_handler*()> _get_deep_mind_logger;
}
