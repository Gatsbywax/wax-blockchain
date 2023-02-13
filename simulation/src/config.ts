export const default_blocks_dir_name = "blocks";
export const reversible_blocks_dir_name = "reversible";

export const default_state_dir_name = "state";
export const forkdb_filename = "fork_db.dat";
export const default_state_size = 1 * 1024 * 1024 * 1024;
export const default_state_guard_size = 128 * 1024 * 1024;

export const system_account_name = "eosio";
export const null_account_name = "eosio.null";
export const producers_account_name = "eosio.prods";

// Active permission of producers account requires greater than 2/3 of the producers to authorize
export const majority_producers_permission_name = "prod.major"; // greater than 1/2 of producers needed to authorize
export const minority_producers_permission_name = "prod.minor"; // greater than 1/3 of producers needed to authorize0

export const eosio_auth_scope = "eosio.auth";
export const eosio_all_scope = "eosio.all";

export const active_name = "active";
export const owner_name = "owner";
export const eosio_any_name = "eosio.any";
export const eosio_code_name = "eosio.code";

export const block_interval_ms = 500;
export const block_interval_us = block_interval_ms * 1000;
export const block_timestamp_epoch = 946684800000; // epoch is year 2000.
export const genesis_num_supported_key_types = 2;

/** Percentages are fixed point with a denominator of 10,000 */
export const percent_100 = 10000;
export const percent_1 = 100;

export const account_cpu_usage_average_window_ms = 24 * 60 * 60 * 1000;
export const account_net_usage_average_window_ms = 24 * 60 * 60 * 1000;
export const block_cpu_usage_average_window_ms = 60 * 1000;
export const block_size_average_window_ms = 60 * 1000;
export const maximum_elastic_resource_multiplier = 1000;

//export const   default_max_storage_size       = 10 * 1024;
//export const   default_max_trx_runtime        = 10*1000;
//export const   default_max_gen_trx_size       = 64 * 1024;

export const rate_limiting_precision = 1000 * 1000;

export const default_max_block_net_usage = 1024 * 1024; /// at 500ms blocks and 200byte trx, this enables ~10,000 TPS burst
export const default_target_block_net_usage_pct = 10 * percent_1; /// we target 1000 TPS
export const default_max_transaction_net_usage =
  default_max_block_net_usage / 2;
export const default_base_per_transaction_net_usage = 12; // 12 bytes (11 bytes for worst case of transaction_receipt_header + 1 byte for static_variant tag)
export const default_net_usage_leeway = 500; // TODO: is this reasonable?
export const default_context_free_discount_net_usage_num = 20; // TODO: is this reasonable?
export const default_context_free_discount_net_usage_den = 100;
export const transaction_id_net_usage = 32; // 32 bytes for the size of a transaction id

export const default_max_block_cpu_usage = 200000; /// max block cpu usage in microseconds
export const default_target_block_cpu_usage_pct = 10 * percent_1;
export const default_max_transaction_cpu_usage =
  (3 * default_max_block_cpu_usage) / 4; /// max trx cpu usage in microseconds
export const default_min_transaction_cpu_usage = 100; /// min trx cpu usage in microseconds (10000 TPS equiv)
export const default_subjective_cpu_leeway_us = 31000; /// default subjective cpu leeway in microseconds

export const default_max_trx_lifetime = 60 * 60; // 1 hour
export const default_deferred_trx_expiration_window = 10 * 60; // 10 minutes
export const default_max_trx_delay = 45 * 24 * 3600; // 45 days
export const default_max_inline_action_size = 512 * 1024; // 512 KB
export const default_max_inline_action_depth = 4;
export const default_max_auth_depth = 6;
export const default_sig_cpu_bill_pct = 50 * percent_1; // billable percentage of signature recovery
export const default_block_cpu_effort_pct = 80 * percent_1; // percentage of block time used for producing block
export const default_controller_thread_pool_size = 2;
export const default_max_variable_signature_length = 16384;
export const default_max_nonprivileged_inline_action_size = 4 * 1024; // 4 KB
export const default_max_action_return_value_size = 256;

export const default_max_transaction_finality_status_success_duration_sec = 180;
export const default_max_transaction_finality_status_failure_duration_sec = 180;

export const default_max_wasm_mutable_global_bytes = 1024;
export const default_max_wasm_table_elements = 1024;
export const default_max_wasm_section_elements = 8192;
export const default_max_wasm_linear_memory_init = 64 * 1024;
export const default_max_wasm_func_local_bytes = 8192;
export const default_max_wasm_nested_structures = 1024;
export const default_max_wasm_symbol_bytes = 8192;
export const default_max_wasm_module_bytes = 20 * 1024 * 1024;
export const default_max_wasm_code_bytes = 20 * 1024 * 1024;
export const default_max_wasm_pages = 528;
export const default_max_wasm_call_depth = 251;

export const min_net_usage_delta_between_base_and_max_for_trx = 10 * 1024;
// Should be large enough to allow recovery from badly set blockchain parameters without a hard fork
// (unless net_usage_leeway is set to 0 and so are the net limits of all accounts that can help with resetting blockchain parameters).

export const fixed_net_overhead_of_packed_trx = 16; // TODO: is this reasonable?

export const fixed_overhead_shared_vector_ram_bytes = 16; ///< overhead accounts for fixed portion of size of shared_vector field
export const overhead_per_row_per_index_ram_bytes = 32; ///< overhead accounts for basic tracking structures in a row per index
export const overhead_per_account_ram_bytes = 2 * 1024; ///< overhead accounts for basic account storage and pre-pays features like account recovery
export const setcode_ram_bytes_multiplier = 10; ///< multiplier on contract size to account for multiple copies and cached compilation

export const hashing_checktime_block_size = 10 * 1024; /// call checktime from hashing intrinsic once per this number of bytes

export const default_abi_serializer_max_time_us = 15 * 1000; ///< default deadline for abi serialization methods

/**
 *  The number of sequential blocks produced by a single producer
 */
export const producer_repetitions = 12;
export const max_producers = 125;

export const maximum_tracked_dpos_confirmations = 1024; ///<

/**
 * The number of blocks produced per round is based upon all producers having a chance
 * to produce all of their consecutive blocks.
 */
//export const blocks_per_round = producer_count * producer_repetitions;

export const irreversible_threshold_percent = 70 * percent_1;

export const billable_alignment = 16;
