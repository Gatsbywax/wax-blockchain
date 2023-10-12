### A General Transaction Fee Formula for the WAX Blockchain:

This formula is used widely in the proposed fee models for WAX, so a separate explainer is provided to give more insight to it.
The proposed fee formula incorporates various parameters to dynamically calculate transaction fees based on network utilization and individual transaction resource consumption. This adaptive mechanism aims to maintain network stability, mitigate DoS attacks, and provide fairness in transaction fee assignment.

#### Formula Breakdown:

```
fee = fee_scaler * ((1 / (max_block_cpu - ema_block_cpu)) - (1 / (max_block_cpu - free_block_cpu_threshold))) * tx_cost_metric
```

#### Component Descriptions:

- **fee_scaler**: A tunable constant, determined experimentally, to ensure the generation of reasonable fee values, particularly when the network utilization exceeds the threshold set by the exponential moving average (EMA) of block CPU usage.

- **max_block_cpu**: Represents the already existing preset limit of CPU resources allocated for processing a block, establishing a computational boundary to prevent network overload.

- **ema_block_cpu**: The Exponential Moving Average of the CPU usage for the current block. Ideally, this value should be objectivity determined, which could involve establishing an agreed-upon block CPU cost across the network for individual each block.

- **free_block_cpu_threshold**: Defines the CPU usage threshold at which transaction fees begin to apply. This value is typically set to 0 but can be modified through contract updates to adapt to network requirements.

- **tx_cost_metric**: A weight assigned to individual transactions, representing the amount of chain resources consumed. This metric allows the fee to be adjusted proportionally to the resources utilized by a transaction. This maybe CPU, Net, action count, a combination of any of them, etc. This value is somewhat analogous to gas in EVM world.

#### Special Case: free_block_cpu_threshold = 0

In the scenario where `free_block_cpu_threshold` is set to 0, the fee formula expands to:

```
fee = fee_scaler * tx_cost_metric / (max_block_cpu - ema_block_cpu) - fee_scaler * tx_cost_metric / max_block_cpu
```

As a function of **ema_block_cpu**, the term on the right is a constant designed to make sure the transaction fees equal zero when **ema_block_cpu** equals zero. In other words, no chain activity implies zero fees for the first transaction. Starting fees at zero is an arbitrary choice, so we can consider the case where the right hand constant is removed:

```
fee = fee_scaler * tx_cost_metric / (max_block_cpu - ema_block_cpu)
```

And we see that this formula is just a regular hyperbola with a vertical asymptote at **max_block_cpu**. The more complex equation at the top should be thought of in this manner as just a translated hyperbola for which fees go to infinity as the **ema_block_cpu** gets close to **max_block_cpu**.

#### Analysis:

This formula underscores the adaptability of the fee structure to network dynamics. The fee escalates as the `ema_block_cpu` approaches `max_block_cpu`, reflecting increased network utilization. Additionally, the `tx_cost_metric` ensures that transactions consuming more resources are charged proportionally higher fees.

The special case where `free_block_cpu_threshold` equals 0 will likely be the typical case, and it is useful to look at to assist reasoning about how this function works at its limits: When ema_block_cpu approaches max_block_cpu the fees increase toward infinity, and when ema_block_cpu approaches zero fees decrease toward zero.

As fees climb toward infinity we should expect this to have a mitigating effect on DoS attacks

The formula will accommodate network variations in network load and transaction resource consumption, while offering flexibility through configurable parameters.

**Examine and interactively manipulated the fee equation in this** [graph](https://raw.githack.com/worldwide-asset-exchange/wax-blockchain/tokenomics-graphs/graphs/fee-profile.html)
