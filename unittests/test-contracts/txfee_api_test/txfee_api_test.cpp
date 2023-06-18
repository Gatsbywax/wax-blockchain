#include "txfee_api_test.hpp"

[[eosio::action]] void txfee_api_test::setparams() {
   eosio::internal_use_do_not_use::set_fee_parameters(1, 2, 3, 4);
}

[[eosio::action]] void txfee_api_test::configfees(eosio::name account) {
   eosio::internal_use_do_not_use::config_fee_limits(account.value, 1234, 5678);
}

[[eosio::action]] void txfee_api_test::setfees(eosio::name account) {
   eosio::internal_use_do_not_use::set_fee_limits(account.value, 100, 200);
}

[[eosio::action]] void txfee_api_test::getfees(eosio::name account, int64_t expected_net_pending_weight, int64_t expected_cpu_consumed_weight) {
   int64_t net_weight_consumption, cpu_weight_consumption;
   eosio::internal_use_do_not_use::get_fee_consumption(account.value, &net_weight_consumption, &cpu_weight_consumption);
   eosio::check( net_weight_consumption == expected_net_pending_weight, "Error does not match");
   eosio::check( cpu_weight_consumption == expected_cpu_consumed_weight, "Error does not match");
}
