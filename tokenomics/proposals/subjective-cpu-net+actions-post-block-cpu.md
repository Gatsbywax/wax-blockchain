# WAX Blockchain Fee Involving Net, Actions and Objective Block CPU EMA

One primary concern is to find a fee calculation utilizing objective measures.
The design proposed is not meant to be complete in every detail that would need adjustment, but gives the important mechanics of the approach.

## Proposed Solution

Allow producer nodes to set their CPU time for a block when they produce it. This method provides an objective value for the block CPU across the entire network.

The transaction fee can be based on both the network bandwidth (Net) consumed and the number of actions in a transaction. The modified formula for fee calculation is presented as:

fee = fee_scaler * ((1 / (max_block_cpu - ema_block_cpu)) - (1 / (max_block_cpu - free_block_cpu_threshold))) * (net_weight * tx_net_consumption + actions_weight * num_actions_in_tx + base_weight)

Where:
- **fee_scaler**: A constant tweaked experimentally to produce reasonable fee values once the threshold in the exponential block moving average is surpassed.

- **max_block_cpu**: The preset maximum CPU allowed for a block.

- **ema_block_cpu**: The exponential moving average of the current block's CPU usage, updated for every block based on the CPU usage posted by the producing node.

- **free_block_cpu_threshold**: The value at which fees begin to be charged, typically set to 0 but configurable through contract updates.

- **net_weight**: A constant applied for each unit of network bandwidth used.

- **tx_net_consumption**: The network bandwidth amount used by the transaction.

- **actions_weight**: A constant applied for each action within the transaction.

- **num_actions_in_tx**: The total number of actions in the transaction.

- **base_weight**: A fixed constant providing a baseline to both action and net weights.

**Note** This fee equation is described [here](https://raw.githack.com/worldwide-asset-exchange/wax-blockchain/proposals/general-fee-formula.md)

## Analysis

### Strengths:

1. **Objectivity**: By having producers set their CPU time for a block, the system creates a consistent block CPU value, eliminating disparities. Net and transaction actions is also an objective measure. The combination yields an fully objective fee calculation.
2. **Elasticity Based on Network Load**: The formula's EMA component, provides elasticity. When the network is less utilized (lower ema_block_cpu), the fees will be lower, and as the network gets busier, the fees will increase. This dynamic pricing will help balance the network load and prevent DoS attacks.
3. **Fairness**: Incorporating the number of actions ensures that complex transactions, which naturally consume more resources, are charged accordingly.
5. **Tunability**: Constants like fee_scaler, net_weight, actions_weight, and base_weight allow for fine-tuning of the formula based on real-world usage and network conditions.

### Concerns:

1. **Complexity**: Multiple variables and constants mean the network must fine-tune these regularly for optimal performance.
2. **Potential for Gaming**: Nodes might manipulate CPU times to influence fees. However, producers that do would likely be voted out.
3. **User Experience**: Sudden spikes in fees due to high network usage might deter users from transacting during peak times.
4. **Awkard Contract Development** In order to reduce the number of actions in their contract, developers might start using sub optimal programming patterns to allow for less in-line actions resulting from their contract logic
5. **High CPU Actions Do Not get Penalized** Since actions are scored the same regardless of their CPU consumption, some traasnactioons will take up more than their fair share of CPU time and incur the same fee as a transaction with low cpu usage and the same number of actions.

Overall, the proposed mechanism addresses the CPU subjectivity concern while ensuring fees reflect an approximation of resources consumed. Proper implementation and regular fine-tuning would be vital for its success.
