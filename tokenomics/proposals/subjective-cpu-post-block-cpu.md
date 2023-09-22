This approach aims to achieve the goal of non-subjective fee calculation while still retaining the accuracy of measuring a transaction's impact on CPU resources
---

Producer Node's Reported CPU Time: When a producer node produces a block, it includes in the block header its measured CPU time for processing the transactions in that block.

Node's Measured CPU Time: When another node (say an api node or another producer node) receives this block and processes its transactions, it also measures its own CPU time to process the block's transactions.

Scaling Factor: The node then calculates a scaling factor based on the ratio of its measured CPU time to the reported CPU time by the producer node.

Scaling Factor = Node’s Measured CPU Time / Producer’s Reported CPU Time

Scaled CPU Calculation: For the next block's transactions, the node scales its CPU calculations using the scaling factor. If a transaction requires X units of CPU time to process on the node's machine, then:

Scaled CPU Time = X × Scaling Factor

Advantages
--

Uniformity in Fee Calculation: Since all nodes will be using the producer's reported CPU time as a reference, it ensures a level of uniformity in how they scale their CPU times. This should lead to a more predictable and consistent fee calculation.

Fairness: The fee is based on real measurements rather than arbitrary or fixed values. This ensures that users are charged based on the actual resources consumed.

Dynamic: As the system and transaction patterns evolve, or as node hardware improves, the scaling adjusts dynamically.

Concerns
--

Trust in Producer Nodes: This system relies heavily on the truthfulness of the producer node's reported CPU time. A malicious producer could under-report or over-report to manipulate fees.

Variability in Hardware: Nodes could have different hardware capabilities. While the scaling factor attempts to address this, there might still be variability in the perceived costs of transactions due to the vast differences in hardware capabilities.

Extra Overhead: Nodes need to compute the scaling factor and adjust their fee calculation for every block. This could add a slight overhead.

Potential for Discrepancies: If there's a significant discrepancy between the producer's reported CPU time and a node's measured CPU time (due to, say, a highly optimized producer node), the scaling factor could lead to an exaggerated adjustment, potentially making some transactions too costly or too cheap.

Conclusion:

The proposed approach provides a way to derive a more objective and real-time fee calculation based on actual resource consumption, it introduces certain complexities and potential vulnerabilities. The resulting fee calculations are likely to be closer than fully subjective CPU measure, but would still be not fully stynchronized
