#include <boost/test/unit_test.hpp>       /* BOOST_AUTO_TEST_SUITE, etc. */

#include <eosio/testing/tester.hpp>       /* tester */
#include <eosio/chain/exceptions.hpp>     /* config_parse_error */
#include <eosio/chain/resource_limits.hpp>

#include <contracts.hpp>                  /* params_test_wasm, params_test_abi */
#include <test_contracts.hpp>

using namespace eosio;
using namespace eosio::testing;
using namespace eosio::chain::resource_limits;
using mvo = mutable_variant_object;

/**
 * sets params_test contract and activates all protocol features in default constructor
 */
class fees_api_tester : public tester {
public:
   fees_api_tester() : tester(){}
   fees_api_tester(setup_policy policy) : tester(policy){}

   void setup(){
      //set parameters intrinsics are priviledged so we need system account here
      set_code(config::system_account_name, test_contracts::fees_api_test_wasm() );
      set_abi(config::system_account_name, test_contracts::fees_api_test_abi().data() );
      produce_block();
   }

   void action(name action_name, mvo mvo){
      push_action(config::system_account_name, action_name, config::system_account_name, fc::mutable_variant_object()
              ("account", "tester")
      );
      produce_block();
   }
};

/**
 * this class is to setup protocol feature `blockchain_parameters` but not `action_return_value`
 */
class fees_api_tester2 : public fees_api_tester{
public:
   fees_api_tester2() : fees_api_tester(setup_policy::preactivate_feature_and_new_bios){
      const auto& pfm = control->get_protocol_feature_manager();
      const auto& d = pfm.get_builtin_digest(builtin_protocol_feature_t::allow_charging_fee);
      BOOST_REQUIRE(d);
      
      preactivate_protocol_features( {*d} );
      produce_block();
   }

   void setup(){
      fees_api_tester::setup();
   }
};

BOOST_AUTO_TEST_SUITE(fees_api_tests)

BOOST_FIXTURE_TEST_CASE(main_test, fees_api_tester){
   //no throw = success
   action("setparams"_n, mvo());
   action("configfees"_n, mvo());
   action("setfees"_n, mvo());
   push_action(config::system_account_name, "getfees"_n, config::system_account_name, fc::mutable_variant_object()
              ("account", "tester")
              ("expected_net_consumed_weight", 0)
              ("expected_cpu_consumed_weight", 0)
   );
   produce_block();
}

BOOST_AUTO_TEST_SUITE_END()