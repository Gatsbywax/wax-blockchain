/******************************************************************************

                              Online C++ Compiler.
               Code, Compile, Run and Debug C++ program online.
Write your code in this editor and press "Run" button to compile and execute it.

*******************************************************************************/

#include <iostream>
#include <tuple>
#include <stddef.h>
#include <limits.h>

using namespace std;
typedef __int128 int128_t;
typedef unsigned __int128 uint128_t;
const uint64_t Precision = 1000 * 1000;
template <typename UnsignedIntType>
constexpr UnsignedIntType integer_divide_ceil(UnsignedIntType num, UnsignedIntType den)
{
    return (num / den) + ((num % den) > 0 ? 1 : 0);
}

template <typename T>
struct ratio
{
    static_assert(std::is_integral<T>::value, "ratios must have integral types");
    T numerator;
    T denominator;

    friend inline bool operator==(const ratio &lhs, const ratio &rhs)
    {
        return std::tie(lhs.numerator, lhs.denominator) == std::tie(rhs.numerator, rhs.denominator);
    }

    friend inline bool operator!=(const ratio &lhs, const ratio &rhs)
    {
        return !(lhs == rhs);
    }
    void print()
    {
        cout << "numerator: " << numerator << endl;
        cout << "denominator: " << denominator << endl;
    }
};
template <typename T>
ratio<T> make_ratio(T n, T d)
{
    return ratio<T>{n, d};
}

template <typename T>
T operator*(T value, const ratio<T> &r)
{
    return (value * r.numerator) / r.denominator;
}

struct exponential_moving_average_accumulator
{
    static_assert(Precision > 0, "Precision must be positive");

    exponential_moving_average_accumulator()
        : last_ordinal(0), value_ex(0), consumed(0)
    {
    }

    uint32_t last_ordinal; ///< The ordinal of the last period which has contributed to the average
    uint64_t value_ex;     ///< The current average pre-multiplied by Precision
    uint64_t consumed;     ///< The last periods average + the current periods contribution so far

    void print()
    {
        cout << "EMAC last_ordinal: " << last_ordinal << endl;
        cout << "EMAC value_ex: " << value_ex << endl;
        cout << "EMAC consumed: " << consumed << endl;
        cout << "EMAC average: " << average() << endl;
    }
    /**
     * return the average value
     */
    uint64_t average() const
    {
        return integer_divide_ceil(value_ex, Precision);
    }

    void add(uint64_t units, uint32_t ordinal, uint32_t window_size /* must be positive */)
    {

        auto value_ex_contrib = (uint64_t)(integer_divide_ceil((uint128_t)units * Precision, (uint128_t)window_size));
        cout << "value_ex_contrib: " << value_ex_contrib << endl;
        if (last_ordinal != ordinal)
        {
            if ((uint64_t)last_ordinal + window_size > (uint64_t)ordinal)
            {
                const auto delta = ordinal - last_ordinal; // clearly 0 < delta < window_size
                cout << "delta: " << delta << endl;
                const auto decay = make_ratio(
                    (uint64_t)window_size - delta,
                    (uint64_t)window_size);
                cout << "numerator: " << decay.numerator << endl;
                cout << "denominator: " << decay.denominator << endl;
                value_ex = value_ex * decay;
                cout << "value_ex: " << value_ex << endl;
                cout << "value_ex: " << (value_ex * decay.numerator) / decay.denominator << endl;
            }
            else
            {
                value_ex = 0;
            }

            last_ordinal = ordinal;
            consumed = average();
        }

        consumed += units;
        value_ex += value_ex_contrib;
    }
};

uint64_t expected_elastic_iterations(uint64_t from, uint64_t to, uint64_t rate_num, uint64_t rate_den)
{
    uint64_t result = 0;
    uint64_t cur = from;

    while ((from < to && cur < to) || (from > to && cur > to))
    {
        cur = cur * rate_num / rate_den;
        result += 1;
    }

    return result;
}

uint64_t expected_exponential_average_iterations(uint64_t from, uint64_t to, uint64_t value, uint64_t window_size)
{
    uint64_t result = 0;
    uint64_t cur = from;

    while ((from < to && cur < to) || (from > to && cur > to))
    {
        cur = cur * (uint64_t)(window_size - 1) / (uint64_t)(window_size);
        cur += value / (uint64_t)(window_size);
        result += 1;
    }

    return result;
}

int main()
{
    cout << "account_cpu_usage_average_window: " << expected_elastic_iterations(200000, 200000000, 1000, 999);
    cout << "account_cpu_usage_average_window: " << expected_exponential_average_iterations(0, 20000, 200000, 60 * 1000 / 500);
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
    return 0;
}
