#pragma once

#include <eosio/eosio.hpp>
#include <tuple>

namespace eosio {
   namespace internal_use_do_not_use {
      extern "C" {
         __attribute__((eosio_wasm_import))
         void set_fees_parameters(uint64_t cpu_fee_scaler, uint64_t free_block_cpu_threshold, uint64_t net_fee_scaler, uint64_t free_block_net_threshold);

         __attribute__((eosio_wasm_import))
         void config_account_fees(uint64_t account, int64_t max_fee_per_tx, int64_t max_fee);

         __attribute__((eosio_wasm_import))
         void set_account_resource_fees( uint64_t account, int64_t net_weight, int64_t cpu_weight);

         __attribute__((eosio_wasm_import))
         void get_account_consumed_fees( uint64_t account, int64_t* net_consumed_weight, int64_t* cpu_consumed_weight);
      }
   }
}

class [[eosio::contract]] fees_api_test : public eosio::contract {
public:
   using eosio::contract::contract;

   [[eosio::action]] void setparams();

   [[eosio::action]] void configfees(eosio::name account);

   [[eosio::action]] void setfees(eosio::name account);

   [[eosio::action]]
   void getfees(eosio::name account, int64_t expected_net_consumed_weight, int64_t expected_cpu_consumed_weight);
};
