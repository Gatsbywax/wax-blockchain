# Non-subjective Fee Calculation Based on Network (Net) and Transaction Actions

Using the network (Net) consumed and the number of actions in a transaction as a basis for the fee calculation provides an alternative to CPU-based fees that may be more objective, as Net is a concrete resource (it represents the storage required for transaction history) and the number of actions is an easily countable metric. Here's how such a formula might look:

### Fee Calculation:

Fee = (NetConsumed × NetRate) + (NumActions × ActionRate) + BaseFee

**Where:**
- `NetConsumed` is the amount of network bandwidth used by the transaction.
- `NetRate` is the cost per unit of network bandwidth.
- `NumActions` is the number of actions in the transaction.
- `ActionRate` is a fixed cost per action.
- `BaseFee` is a fixed value per transaction

## Analysis
---
### Advantages:
1. **Objectivity**: This formula relies on concrete metrics (Net consumed and number of actions) rather than subjective metrics like CPU, ensuring that the fee calculation is consistent across nodes.
2. **Transparency**: Users can easily understand how fees are derived. They can optimize their transactions based on the Net they consume or reduce the number of actions to minimize fees.
3. **Flexibility**: The rates (NetRate and ActionRate) can be adjusted by the network to reflect the actual costs of resources and to maintain network health.

### Disadvantages:
1. Does not scale with increased network activity (Deal breaker)
2. **May Not Reflect Real Costs**: While CPU is a subjective metric, it captures the computational effort required to process a transaction. Transactions that consume more Net might not always be computationally intensive, and vice versa.
3. **Potential for Abuse**: If not properly balanced, users might be incentivized to create transactions that consume minimal Net but are computationally heavy, potentially creating a bottleneck in the network.
4. **Increased Complexity**: Introducing another dimension to the fee calculation (number of actions) means developers and users need to be more mindful of the structure of their transactions.

### Other Considerations:
- **Burst vs. Sustained Usage**: Just as with CPU, there might be scenarios where short bursts of high Net usage are acceptable, while sustained high usage is not. The formula might need adjustments or added components to address this.
- **Economic Implications**: The choice of NetRate and ActionRate can influence user behavior. If the ActionRate is too high, for example, developers might be disincentivized from creating multifunctional transactions.

## Conclusion
---
While basing transaction fees on Net consumed and the number of actions offers a more objective alternative to CPU-based fees, it comes with its own set of challenges and trade-offs. It's essential to strike a balance to ensure that the fees fairly represent the cost of network resources, without inadvertently creating incentives for users to structure transactions in ways that might harm network performance. Regularly reviewing and adjusting the rates and monitoring network health will be crucial if such a fee structure is adopted.
Further, the fee does bnot increase as the network congests, leaving this unusable in the current form.
