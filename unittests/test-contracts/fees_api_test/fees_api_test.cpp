#include "fees_api_test.hpp"

[[eosio::action]] void fees_api_test::setparams() {
   eosio::internal_use_do_not_use::set_fees_parameters(1, 2, 3, 4);
}

[[eosio::action]] void fees_api_test::configfees(eosio::name account) {
   eosio::internal_use_do_not_use::config_account_fees(account.value, 1234, 5678);
}

[[eosio::action]] void fees_api_test::setfees(eosio::name account) {
   eosio::internal_use_do_not_use::set_account_resource_fees(account.value, 100, 200);
}

[[eosio::action]] void fees_api_test::getfees(eosio::name account, int64_t expected_net_consumed_weight, int64_t expected_cpu_consumed_weight) {
   int64_t net_consumed_weight, cpu_consumed_weight;
   eosio::internal_use_do_not_use::get_account_consumed_fees(account.value, &net_consumed_weight, &cpu_consumed_weight);
   eosio::check( net_consumed_weight == expected_net_consumed_weight, "Error does not match");
   eosio::check( cpu_consumed_weight == expected_cpu_consumed_weight, "Error does not match");
}
