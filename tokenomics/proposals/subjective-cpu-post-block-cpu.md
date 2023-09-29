# Semi Subjective Fee Model for WAX: Producer Submitted Block CPU Times

This approach aims to achieve the goal of non-subjective fee calculation while still retaining the accuracy of measuring a transaction's impact on CPU resources.

The design proposed is not meant to be complete in every detail that would need adjustment, but gives the important mechanics of the approach.

---

## Producer Node's Reported CPU Time
When a producer node produces a block, it includes in the block header its measured CPU time for processing the transactions in that block.

## Node's Measured CPU Time
When another node (say an api node or another producer node) receives this block and processes its transactions, it also measures its own CPU time to process the block's transactions.

## Scaling Factor
The node then calculates a scaling factor based on the ratio of its measured CPU time to the reported CPU time by the producer node.

Scaling Factor = Node’s Measured CPU Time / Producer’s Reported CPU Time

## Scaled CPU Calculation for Fee Calculation
For the next block's transactions, the node scales its CPU calculations using the scaling factor. If a transaction requires X units of CPU time to process on the node's machine, then:

scaled_tx_cpu_consumption = Scaled CPU Time = X × Scaling Factor

## Fee Calculation
For the next block's transactions, the node scales its CPU calculations using the scaling factor. If a transaction requires X units of CPU time to process on the node's machine, then:

```
fee = fee_scaler * (1 / (max_block_cpu - ema_block_cpu) - 1 / (max_block_cpu - free_block_cpu_threshold)) * scaled_tx_cpu_consumption
```
where:
* fee_scaler is a constant that will be massaged experimentally to give reasonable fee values once the free threshold is passed in the exponential block moving average
* max_block_cpu is the maximum cpu permitted to be used in a block which is set via config already
* ema_block_cpu is the exponential moving average of the current block cpu usage. This is updated for every block using the posted block CPU usage by the producing node
* free_block_cpu_threshold is the value of the exponential moving block value, ema_block_cpu_ratio, at which fees start being charged. This is a constant, which should be configurable via contract updates. This value will typically be set to 0

**Note** This fee equation is described [here](https://github.com/worldwide-asset-exchange/wax-blockchain/blob/tokenomics-graphs/tokenomics/proposals/general-fee-formula.md)

## Advantages

- **Uniformity in Fee Calculation:** Since all nodes will be using the producer's reported CPU time as a reference, it ensures a level of uniformity in how they scale their CPU times. This should lead to a more predictable and consistent fee calculation.

- **Fairness:** The fee is based on real measurements rather than arbitrary or fixed values. This ensures that users are charged based on the actual resources consumed.

- **Dynamic:** As the system and transaction patterns evolve, or as node hardware improves, the scaling adjusts dynamically.

## Concerns

- **Trust in Producer Nodes:** This system relies heavily on the truthfulness of the producer node's reported CPU time. A malicious producer could under-report or over-report to manipulate fees.

- **Variability in Hardware:** Nodes could have different hardware capabilities. While the scaling factor attempts to address this, there might still be variability in the perceived costs of transactions due to the vast differences in hardware capabilities.

- **Extra Overhead:** Nodes need to compute the scaling factor and adjust their fee calculation for every block. This could add a slight overhead.

- **Potential for Discrepancies:** If there's a significant discrepancy between the producer's reported CPU time and a node's measured CPU time (due to, say, a highly optimized producer node), the scaling factor could lead to an exaggerated adjustment, potentially making some transactions too costly or too cheap.

## Conclusion

The proposed approach provides a way to derive a more objective (but not fully objective) and real-time fee calculation based on actual resource consumption. However, it introduces certain complexities and potential vulnerabilities. The resulting fee calculations are likely to be closer than a fully subjective CPU measure but would still not be fully synchronized.
