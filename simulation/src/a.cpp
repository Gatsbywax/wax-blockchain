/******************************************************************************

                              Online C++ Compiler.
               Code, Compile, Run and Debug C++ program online.
Write your code in this editor and press "Run" button to compile and execute it.

*******************************************************************************/

#include <iostream>
#include <tuple>
#include <stddef.h>
#include <limits.h>
#include <vector>
#include <iostream>
#include <vector>
#include <numeric>
#include <string>
#include <functional>
#include <algorithm>


using namespace std;
// typedef __int128 int128_t;
// typedef unsigned __int128 uint128_t;
// const uint64_t Precision = 1000 * 1000;
// template <typename UnsignedIntType>
// constexpr UnsignedIntType integer_divide_ceil(UnsignedIntType num, UnsignedIntType den)
// {
//     return (num / den) + ((num % den) > 0 ? 1 : 0);
// }

// template <typename T>
// struct ratio
// {
//     static_assert(std::is_integral<T>::value, "ratios must have integral types");
//     T numerator;
//     T denominator;

//     friend inline bool operator==(const ratio &lhs, const ratio &rhs)
//     {
//         return std::tie(lhs.numerator, lhs.denominator) == std::tie(rhs.numerator, rhs.denominator);
//     }

//     friend inline bool operator!=(const ratio &lhs, const ratio &rhs)
//     {
//         return !(lhs == rhs);
//     }
//     void print()
//     {
//         cout << "numerator: " << numerator << endl;
//         cout << "denominator: " << denominator << endl;
//     }
// };
// template <typename T>
// ratio<T> make_ratio(T n, T d)
// {
//     return ratio<T>{n, d};
// }

// template <typename T>
// T operator*(T value, const ratio<T> &r)
// {
//     return (value * r.numerator) / r.denominator;
// }

// struct exponential_moving_average_accumulator
// {
//     static_assert(Precision > 0, "Precision must be positive");

//     exponential_moving_average_accumulator()
//         : last_ordinal(0), value_ex(0), consumed(0)
//     {
//     }

//     uint32_t last_ordinal; ///< The ordinal of the last period which has contributed to the average
//     uint64_t value_ex;     ///< The current average pre-multiplied by Precision
//     uint64_t consumed;     ///< The last periods average + the current periods contribution so far

//     void print()
//     {
//         cout << "EMAC last_ordinal: " << last_ordinal << endl;
//         cout << "EMAC value_ex: " << value_ex << endl;
//         cout << "EMAC consumed: " << consumed << endl;
//         cout << "EMAC average: " << average() << endl;
//     }
//     /**
//      * return the average value
//      */
//     uint64_t average() const
//     {
//         return integer_divide_ceil(value_ex, Precision);
//     }

//     void add(uint64_t units, uint32_t ordinal, uint32_t window_size /* must be positive */)
//     {

//         auto value_ex_contrib = (uint64_t)(integer_divide_ceil((uint128_t)units * Precision, (uint128_t)window_size));
//         cout << "value_ex_contrib: " << value_ex_contrib << endl;
//         if (last_ordinal != ordinal)
//         {
//             if ((uint64_t)last_ordinal + window_size > (uint64_t)ordinal)
//             {
//                 const auto delta = ordinal - last_ordinal; // clearly 0 < delta < window_size
//                 cout << "delta: " << delta << endl;
//                 const auto decay = make_ratio(
//                     (uint64_t)window_size - delta,
//                     (uint64_t)window_size);
//                 cout << "numerator: " << decay.numerator << endl;
//                 cout << "denominator: " << decay.denominator << endl;
//                 value_ex = value_ex * decay;
//                 cout << "value_ex: " << value_ex << endl;
//                 cout << "value_ex: " << (value_ex * decay.numerator) / decay.denominator << endl;
//             }
//             else
//             {
//                 value_ex = 0;
//             }

//             last_ordinal = ordinal;
//             consumed = average();
//         }

//         consumed += units;
//         value_ex += value_ex_contrib;
//     }
// };

// uint64_t expected_elastic_iterations(uint64_t from, uint64_t to, uint64_t rate_num, uint64_t rate_den)
// {
//     uint64_t result = 0;
//     uint64_t cur = from;

//     while ((from < to && cur < to) || (from > to && cur > to))
//     {
//         cur = cur * rate_num / rate_den;
//         result += 1;
//     }

//     return result;
// }

// uint64_t expected_exponential_average_iterations(uint64_t from, uint64_t to, uint64_t value, uint64_t window_size)
// {
//     uint64_t result = 0;
//     uint64_t cur = from;

//     while ((from < to && cur < to) || (from > to && cur > to))
//     {
//         cur = cur * (uint64_t)(window_size - 1) / (uint64_t)(window_size);
//         cur += value / (uint64_t)(window_size);
//         result += 1;
//     }

//     return result;
// }

// void get_account_cpu_limit_ex() {

//    auto greylist_limit = 1000;
//    int64_t cpu_weight = 234;
//    auto state_total_cpu_weight = 3430;
//    auto cpu_limit_parameters_max  = 200000;
//    auto state_virtual_cpu_limit = 200000;
//    auto rate_limiting_precision = 1000 * 1000;


//    uint128_t window_size = 172800;
//     cout << "window_size: " << (uint64_t)window_size << endl;
//    bool greylisted = false;
//    uint128_t virtual_cpu_capacity_in_window = window_size;
//    if( greylist_limit < 1000 ) {
//       uint64_t greylisted_virtual_cpu_limit = cpu_limit_parameters_max * greylist_limit;
//       if( greylisted_virtual_cpu_limit < state_virtual_cpu_limit ) {
//          virtual_cpu_capacity_in_window *= greylisted_virtual_cpu_limit;
//          greylisted = true;
//       } else {
//          virtual_cpu_capacity_in_window *= state_virtual_cpu_limit;
//       }
//    } else {
//       virtual_cpu_capacity_in_window *= state_virtual_cpu_limit;
//    }

//    uint128_t user_weight     = (uint128_t)cpu_weight;
//    uint128_t all_user_weight = (uint128_t)state_total_cpu_weight;
//     cout << "virtual_cpu_capacity_in_window: " << (uint64_t)virtual_cpu_capacity_in_window << endl;
//    auto max_user_use_in_window = (virtual_cpu_capacity_in_window * user_weight) / all_user_weight;
//    cout << "max_user_use_in_window: " << (uint64_t)max_user_use_in_window << endl;
//    auto cpu_used_in_window  = integer_divide_ceil((uint128_t)0 * window_size, (uint128_t)rate_limiting_precision);
//    cout << "cpu_used_in_window: " << (uint64_t)cpu_used_in_window << endl;
//     auto available = 0, used = 0, max = 0;
//    if( max_user_use_in_window <= cpu_used_in_window ){
//       available = 0;
//    }
//    else{
//       available = (uint64_t)(max_user_use_in_window - cpu_used_in_window);
//       cout << "available: " << available << endl;
//    }

//    used = (uint64_t)(cpu_used_in_window);
//     max = (uint64_t)(max_user_use_in_window);
//     cout << "available: " << available << endl;
//     cout << "used: " << used << endl;
//     cout << "max: " << max << endl;
// }
int main()
{
    // cout << "account_cpu_usage_average_window: " << expected_elastic_iterations(200000, 200000000, 1000, 999);
    // cout << "account_cpu_usage_average_window: " << expected_exponential_average_iterations(0, 20000, 200000, 60 * 1000 / 500);
    // get_account_cpu_limit_ex();
    // const uint64_t account_cpu_usage_average_window =
    //     24 * 60 * 60 * 1000l / 500;
    // const uint64_t default_max_block_cpu_usage = 200000;

    // auto emac = new exponential_moving_average_accumulator();
    // cout << "account_cpu_usage_average_window: " << account_cpu_usage_average_window << endl;
    // cout << "default_max_block_cpu_usage: " << default_max_block_cpu_usage << endl;
    // emac->add(
    //     default_max_block_cpu_usage,
    //     1,
    //     account_cpu_usage_average_window);
    // emac->print();
    // emac->add(
    //     default_max_block_cpu_usage,
    //     1,
    //     account_cpu_usage_average_window);
    // emac->print();
    vector<uint64_t> weights;
    weights.push_back(234);
    weights.push_back(511);
    weights.push_back(672);
    weights.push_back(800);
    weights.push_back(1213);
    //   vector<int64_t> weights{ 234, 511, 672, 800, 1213 };
      
      const int64_t total = std::accumulate(std::begin(weights), std::end(weights), 0LL);
      vector<int64_t> expected_limits;
      std::transform(std::begin(weights), std::end(weights), std::back_inserter(expected_limits), [total](const auto& v){ return v * 200000 / total; });

      for (int64_t idx = 0; idx < weights.size(); idx++) {
         cout << idx << ": " << expected_limits[idx] << endl;
      }
    return 0;
}