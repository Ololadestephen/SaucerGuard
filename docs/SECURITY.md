# Security and operating limits

This is an educational testnet starter, not audited production swap infrastructure.

| Risk | Mitigation |
| --- | --- |
| Wrong network or contract address | Wallet chain 296 required; frontend reads guard immutables before signing; deploy script restricted to testnet. |
| Stale or manipulated quote | Quote timestamp comes from a chain block; contract requires age ≤30 seconds and re-queries the router. |
| Price deterioration | Frontend rechecks; contract rejects >1% decrease from the reviewed quote; router enforces `minimumOutput`. |
| Wide slippage | Contract rejects a minimum below 97% of the reviewed output. |
| Excessive input | Contract rejects zero and >10 HBAR. |
| Wrong recipient or route | Immutable WHBAR→SAUCE addresses; router output sent to `msg.sender` rather than an arbitrary address. |
| Missing HTS association | Mirror-node check must positively confirm SAUCE before execution; mirror failure is not treated as absence or success. |
| Custody / key exposure | No private keys in the frontend or repository; wallet signs; guard does not receive the output token. |
| External outage | Router, RPC, or mirror-node failures are surfaced and lock execution. No fixture fallback on live paths. |

One exact testnet deployment and guarded SaucerSwap fill are independently verified in [TESTNET_PROOF.md](TESTNET_PROOF.md). This does **not** audit the contract, guarantee another fill, prove every wallet integration, or replace the local mock-router boundary tests. Future quotes, association, pool depth, and gas must be rechecked for every attempted trade.
