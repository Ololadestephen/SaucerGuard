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

The main unproven boundary is the exact testnet deployment and swap. Local Hardhat tests mock the router; they do **not** prove Hedera precompile compatibility, HTS association, or an actual SaucerSwap fill. Complete the testnet proof gate before submitting or calling this chain-verified.
