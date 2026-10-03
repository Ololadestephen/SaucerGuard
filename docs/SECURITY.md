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
| Association signing | Only the fixed testnet SAUCE facade is callable; simulate `associate()` from the connected account and require response code 22; never assume receipt success means the mirror has indexed it. |
| Custody / key exposure | No private keys in the frontend or repository; wallet signs; guard does not receive the output token. |
| External outage | Router, RPC, or mirror-node failures are surfaced and lock execution. No fixture fallback on live paths. |

One exact testnet deployment and guarded SaucerSwap fill are independently verified in [TESTNET_PROOF.md](TESTNET_PROOF.md). This does **not** audit the contract, guarantee another fill, prove every wallet integration, or replace the local mock-router boundary tests. Future quotes, association, pool depth, and gas must be rechecked for every attempted trade.

## Trust boundary

The guard compares the router's current output with caller-supplied `quotedOutput`, `quotedAt`, and `minimumOutput`. It does not authenticate those fields, independently establish a fair price, or require callers to use this frontend. Its age and drift checks protect the values reviewed through this UI; a direct caller can supply another baseline. The router minimum, fixed route, amount cap, and deadline restrictions still apply. Price impact is a frontend policy, not a contract restriction.

Quotes pin every market read to one block, eliminating mixed-block observations. That block is historical as soon as the pool changes. The preflight re-reads, and the guard re-queries at execution, but neither reserves nor a successful simulation guarantee a later fill.

Browser tests inject an isolated EIP-1193 fixture provider and intercept RPC/mirror requests. They verify the application handoff and failure behavior without signing real transactions. The HRC-719 association button is covered by those fixtures; the previously verified real association used the native SDK path.
