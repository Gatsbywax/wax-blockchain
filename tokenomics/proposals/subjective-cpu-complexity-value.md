# Desubjectifying Fee Model for WAX Blockchain Involving Complexity Estimation

This proposed transaction fee model aims to address the subjective nature of CPU as a resource on the WAX blockchain. Given that CPU calculation varies across different nodes, the model introduces an objective approach to measure and charge for transactional complexity.
The design proposed is not meant to be complete in every detail that would need adjustment, but gives the important mechanics of the approach.

## Proposed Approach:

1. **EstimatedTxComplexity:** Introduced as an objective measure, it is provided by the sender in the transaction. It represents the sender's estimation of how complex their transaction is.

2. **ActualTxComplexity:**

ActualTxComplexity = Max Block CPU / (Max Block CPU - transaction CPU)

This is an actual measure of how the transaction impacts the block's available CPU.

3. **Fee Calculation:**
- If `ActualTxComplexity` > `EstimatedTxComplexity`, the transaction is rejected. This ensures that users can't underestimate the complexity of their transaction to avoid higher fees.
- Otherwise, the fee is calculated as:
  ```
  Fee = Complexity Fee Scaler × (1 / (MaxBlockComplexity - EMABlockComplexity) - 1 / MaxBlockComplexity) × EstimatedTxComplexity
  ```
  **Where:**
  - `MaxBlockComplexity` is a pre-defined value indicating the maximum complexity acceptable for a single block.
  - `EMABlockComplexity` is an Exponential Moving Average of the complexity over recent blocks. This offers a smoothed out representation of the complexity trend over time.

  **Note** This fee equation is described [here](https://github.com/worldwide-asset-exchange/wax-blockchain/blob/tokenomics-graphs/tokenomics/proposals/general-fee-formula.md)

## Analysis:

1. **Objectivity:** By relying on a sender-provided `EstimatedTxComplexity` and comparing it against an actual measure, the approach ensures that nodes do not need to make subjective judgments about transaction complexity.
2. **Fee Fairness:** Transactions with higher complexity that consume more CPU will inherently be charged more, ensuring that users pay proportional to their network usage. The inclusion of the Complexity Fee Scaler ensures that there's a base charge, and the additional complexity charges make it fair.
3. **Transparency:** By defining `MaxBlockComplexity` and using EMA for complexity calculations, the model provides a level of predictability and transparency to users about potential transaction costs.
4. **Potential Downsides:**
- **User/dApp/Wallet Error:** Users and/or the utilities they use to send transactions may incorrectly estimate their transaction's complexity. If underestimated, their transactions might be frequently rejected, leading to a poor user experience.
- **Gaming the System:** There might be incentives for users to overestimate their complexity to ensure their transaction gets through, even though they'll pay a higher fee. Over time, if many users overestimate, it might lead to a miscalculation in the EMA of block complexity.
5. **Incentive Alignment:** By charging based on complexity, the proposal encourages users to optimize their transactions for minimal complexity, thus promoting efficient use of blockchain resources.

## Criticisms and Observations:

1. **Criticism:** If we allow the HTTP API do the complexity validation and reject the transaction if the estimation is too low, that will decrease the number of dropped transactions at the BP. Still, it opens too many possibilities for a transaction to disappear, so the UX would suffer.

   **Response:** (Reinterpreting the concern above) Since API nodes would run lesser hardware than producers, a transaction with a tight estimation value that would make it through at the producer level might get rejected at the API level. This might cause estimates to be higher than necessary. If we incorporate a tolerances threshold (see improvements below), individually configurable for every node, then API nodes could run looser tolerance parameters than producer nodes, allowing for less dropped transactions that are estimated efficiently. This also opens the possibility of including metadata in a transaction submission response that indicates the calculated complexity at the node, giving an indicator for UX about how likely the transaction is to be accepted at the producer level.

## Possible Improvements:

### Tolerance Margin:
Instead of rejecting transactions that miscalculate complexity straight away, introduce a tolerance margin. If the `EstimatedTxComplexity` is within this margin of the `ActualTxComplexity`, the transaction is still processed.

### Default Complexity Evaluation
All transactions should have a default complexity evaluation that is applied in the event that a transaction does not include complexity estimation (for backwards compatibility). This could be `ComplexityConstant` * `Number of Actions`. ComplexityConstant should be a global value that satisfies most transactions on the network, like WAX transfers, staking and voting

### Contract Developer Per Action Complexity Guidance
Somehow give developers the ability to give an expected complexity value for each action in their contract that overrides the default `ComplexityConstant` Maybe a table scoped by account and indexed by action that is a readable intrinsic at the blockchain level?

### Educational Tooling:
Offer tools or plugins for wallets that can help users estimate the `EstimatedTxComplexity` of their transaction, based on their transaction content.

## Conclusion:

The proposed transaction fee model introduces a more objective and fair approach to calculating transaction fees based on complexity. While it offers several benefits in terms of transparency and fairness, careful consideration and further testing would be required to mitigate potential downsides, particularly UX issues which may affect adoption.
