This solution seeks to address the problem of subjectivity in transaction fee calculations on the WAX blockchain by tying it to an objective measure. This measure is derived from the concept of proof-of-work (PoW):

Description:
Subjectivity in CPU usage: The underlying issue is that CPU usage, as a measure of transaction costs on nodes, is subjective. This means different nodes might observe different CPU consumptions for the same transaction due to various factors like hardware differences, network latency, etc.

Proof of Work (PoW): To counter the above issue, the proposed solution introduces a PoW concept. Instead of directly using CPU consumption, a transaction must now provide proof that it did a certain amount of computational work, akin to how Bitcoin mining works. The nature of this work is hashing the transaction until a certain number of leading zeros are found in the hash.

Number of Hashes, NumHashes: The amount of work, or the number of hashes a transaction must achieve, is calculated using the formula NumHashes = (Max Block CPU) / (Max Block CPU - transaction CPU). This formula ensures that as the transaction CPU approaches the Max Block CPU, the number of hashes required (or the PoW) goes up.

Transaction Acceptance: If the observed CPU consumption (or the subjective measure) is greater than the expected number of hashes, the transaction is rejected. This acts as a safeguard to prevent abuse.

Transaction Fee: The fee for a transaction is determined by the number of hashes (or PoW) it had to do. The formula given is Fee = Hash Fee Scaler × (1 / (MaxBlockHashes - EMABlockHashes) - 1 / (MaxBlockHashes)) × NumHashes. The MaxBlockHashes is a predefined limit on the number of hashes acceptable for a block, and EMABlockHashes is the Exponential Moving Average (EMA) of hashes in the recent blocks.

Analysis:
  Pros:
    Objectivity: This achieves its primary goal of introducing objectivity into transaction fee calculations. The PoW measure provides a consistent yardstick across nodes.

    Incentive alignment: By tying the transaction fee to PoW, there's an incentive for users to minimize their CPU consumption as higher CPU transactions will require more hashing, incurring higher fees.

    Security: PoW mechanisms have historically added a layer of security, making spamming or abusing the network costly.

  Cons:
    Increased computational overhead: Requiring PoW for every transaction introduces overhead, potentially slowing down the transaction processing time.

    Potential for centralization: Similar to the issues seen in PoW-based cryptocurrencies, entities with significant computational power might find it more economical to send transactions, potentially centralizing the system.

    EMA tuning: The use of EMA requires careful tuning. The smoothing factor in EMA must be chosen judiciously to prevent rapid fluctuations in EMABlockHashes, which can affect transaction fees.

    Usability: For average users, understanding PoW and how fees are calculated can be complex. This might act as a barrier to entry for non-technical users.

    Environmental Concerns: PoW has often been criticized for its environmental impact due to high energy consumption. While the hashing required per transaction is not comparable to mining a block in Bitcoin, at scale, it might still raise concerns.

In conclusion, while this method introduces a way to bring objectivity into fee calculations, careful consideration of the trade-offs will be essential. Implementing PoW for fee calculations might deter spammy transactions but at the cost of increased computational overhead and potential centralization. Proper testing and simulations should be conducted before such a change.


Possible Improvements
---
The proposed mechanism is essentially using a proof-of-work (PoW) approach to enforce transaction fees, where the cost is determined by how much computational effort (in terms of hashes) is required to process a transaction. This is coupled with an Exponential Moving Average (EMA) of recent block hashes to ensure a dynamic pricing model.

Here are some improvements and considerations for this proposal:

1. Proof-of-Work (PoW) Mechanism:
Environment Concern: One of the main criticisms of PoW is its environmental impact due to high energy consumption. Before implementing this, consider the energy consumption implications, especially when scaling up.

Inefficient for Users: Requiring users to perform PoW for each transaction can lead to a slower transaction time, especially for users with less computational power.

Possible Improvement: Consider a hybrid model, where only a subset of transactions require PoW, perhaps determined by some criteria like transaction value, frequency, etc.

2. Determining the Number of Hashes:
The formula for determining the number of hashes (NumHashes) is dependent on the block's CPU. While this captures the cost to run it on a node, it could make it challenging for users to predict costs and lead to unfair scenarios where transactions are rejected due to unexpected CPU spikes.

Possible Improvement: Implement a tiered system where certain types of transactions or services have a predefined hash requirement. This can give users a clearer idea of what to expect in terms of costs.

3. EMA of Block Hashes:
Using an EMA to smooth out the number of hashes provides a good mechanism to adjust fees dynamically. However, it also adds complexity for users trying to predict their transaction costs.

Possible Improvement: Provide an API or interface where users can check the current EMA value. This allows users to make more informed decisions about submitting their transactions.

4. MaxBlockHashes Consideration:
The MaxBlockHashes parameter indicates the maximum acceptable hashes for a single block. However, setting this too high or too low can respectively result in wasted energy or hindered network capacity.

Possible Improvement: Periodically review and adjust the MaxBlockHashes based on network capacity, user feedback, and environmental considerations.

5. Hash Fee Scaler:
The Hash Fee Scaler is crucial for determining the actual fee. It would be beneficial to provide clarity on how this value is determined and if it's static or dynamic.

Possible Improvement: Consider a governance model where changes to the Hash Fee Scaler can be proposed and voted upon by stakeholders.

6. User Experience:
The entire mechanism might be complex for end-users to grasp, especially if they are used to more straightforward fee models.

Possible Improvement: Implement user-friendly tools, interfaces, and documentation. This can include a transaction fee estimator, which can inform users about the expected fee based on current network conditions.

7. Potential for Centralization:
Relying heavily on PoW might favor entities with more computational power, leading to centralization concerns.

Possible Improvement: Implement mechanisms to ensure that smaller participants aren't disproportionately disadvantaged.

8. Fallback Mechanism:
In cases where the PoW mechanism faces issues or becomes a bottleneck, having a fallback mechanism ensures the network's functionality.

Possible Improvement: Consider implementing a secondary fee mechanism that can be triggered if the PoW mechanism becomes problematic.

In summary, while the proposal is innovative, it intertwines the complexities of PoW with the dynamic nature of CPU-based transaction costs. It's essential to ensure a balance between fairness, efficiency, user experience, and environmental impact when refining this proposal.
