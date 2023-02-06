/*
  Rough fee formula

  Total CPU: 1000ms
  CPU Tx: 1ms
  TOTAL CPU STAKE: 100WAX

  Fee = (1/1000)*100

  Fee = fee_constant*(CPU_Tx/TOTAL_CPU) * TOTAL_CPU_STAKE
*/

const {exponential_moving_average_accumulator} = require('./resource-limits-private.js');

const emac = new exponential_moving_average_accumulator();

const window_size = 60;


emac.add(10, 3, window_size);
emac.print();
emac.add(8, 4, window_size);
emac.print();
emac.add(22, 61, window_size);
emac.print();
emac.add(7, 62, window_size);
emac.print();
emac.add(31, 72, window_size);
emac.print();
