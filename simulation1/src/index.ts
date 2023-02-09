import * as config from "./config";
import { exponential_moving_average_accumulator } from "./resource-limits-private";
import {
  initialize_account,
  update_account_usage,
} from "./resource-limits-common";

initialize_account("quocle1");
initialize_account("quocle2");
initialize_account("quocle3");
update_account_usage(["quocle2", "quocle3"], 12345678);
// const emac = new exponential_moving_average_accumulator();

// const window_size = 60;
// const current_time_seconds = (new Date().getTime() / 1000).toFixed();
// console.log("current_time_seconds", current_time_seconds);
// emac.add(
//   10000,
//   Number(current_time_seconds),
//   config.account_cpu_usage_average_window_ms
// );
// emac.print();
// emac.add(
//   20000,
//   Number(current_time_seconds) + 4,
//   config.account_cpu_usage_average_window_ms
// );
// emac.add(
//   50000,
//   Number(current_time_seconds) + 4,
//   config.account_cpu_usage_average_window_ms
// );
// emac.print();
