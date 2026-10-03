# Building on SaucerGuard

## What developers gain

This template connects five concerns that a bare swap call leaves to the builder: HTS association, Hedera's two native-value units, a consistent AMM observation, policy enforcement across the wallet handoff, and a public transaction result. SaucerSwap supplies the actual liquidity and execution. Removing its router or pool breaks the swap use case.

The fixed route makes those concerns easy to trace. The guide describes the changes needed for another route; the shipped application still supports only HBAR to testnet SAUCE.

## Follow one trade

1. `parseHbarInput` turns the user's decimal amount into exact protocol tinybars. `0.1 HBAR` becomes `10,000,000`.
2. `readLiveQuote` obtains a confirmed block, then pins router identity, quote, factory, pair identity, and reserves to its number. Both token addresses must match WHBAR/SAUCE in either ordering. Price impact plus fee is rounded upward.
3. `/api/token-association` asks the testnet mirror node about the connected EVM address and exact SAUCE token ID. Unknown evidence keeps execution locked. An empty, valid token list means absent association.
4. If needed, the wallet can call HRC-719 `associate()` on SAUCE's token facade. Simulation must return code 22 before a signature is requested. The receipt is displayed; the mirror check remains authoritative for the next swap.
5. The swap preflight checks guard immutables and obtains another quote. The wallet request uses `tinybarsToWeibars` on the reviewed amount, independent of decimal display formatting.
6. The guard sees `msg.value` in tinybars, re-queries the fixed router, enforces its policy, and forwards the output directly to the calling trader. An invalid router response reverts the whole call.
7. The UI waits for a successful receipt before showing its mirror-node link. A rejected request or reverted receipt cannot become a successful swap message.

## Units are part of the contract

| Boundary | Unit | 0.1-HBAR example |
| --- | --- | --- |
| Input parser and router `amountIn` | tinybars, 8 HBAR decimals | `10,000,000` |
| EVM wallet transaction `value` | weibars, 18 HBAR decimals | `100,000,000,000,000,000` |
| Hedera Solidity `msg.value` | tinybars | `10,000,000` |
| SAUCE router output and `minimumOutput` | token base units, 6 SAUCE decimals | `5,408,280` means `5.408280 SAUCE` in the recorded proof |
| Policy percentage | integer basis points | `100` means `1%` |

One tinybar equals `10^10` weibars. Do not pass an 18-decimal wallet value to `getAmountsOut`, change the native currency to eight decimals in an EVM wallet, or convert financial quantities through JavaScript floating-point numbers. The frontend and contract limits intentionally describe the same ten-HBAR size.

## Which layer enforces what

| Requirement | Frontend | Guard/router |
| --- | --- | --- |
| Wallet on chain 296 | Checked | Deployment is testnet-only; contract itself is ordinary Solidity |
| SAUCE association | Verified with mirror; separate signed association action | HTS transfer may fail if the account cannot receive the token |
| Fixed router and route | Reads guard identities and both pool tokens | Immutable router/WHBAR/SAUCE |
| Ten-HBAR cap | Exact parser and wallet conversion | `MAX_INPUT_TINYBARS` |
| Quote age ≤30 seconds | Countdown and preflight | Compares caller-supplied `quotedAt` with block time |
| Deterioration ≤1% | Fresh preflight versus reviewed output | Fresh router output versus caller-supplied output |
| Price impact plus fee ≤3% | Reserve-based estimate, rounded upward | Not enforced by the contract |
| Minimum output and deadline | User review | Guard limits + router execution |
| Successful completion | Receipt status check | Atomic execution and event |

`quotedOutput` and `quotedAt` are supplied by the caller, not a signed oracle. A direct caller can choose another baseline. This pattern constrains the UI's reviewed execution and the fixed router handoff; it cannot establish an independent fair market price. See [security](SECURITY.md).

## Adapt to a different testnet token

1. Confirm the token's ID, long-zero EVM address, decimals, custom fees, freeze/KYC restrictions, and supported association behavior using authoritative chain/protocol data.
2. Confirm a liquid SaucerSwap V1 pair and router support. A V2/V3 API needs a new adapter and guard interface; changing an address alone is insufficient.
3. Update `lib/saucer/config.ts`, the token labels, association endpoint filter, test fixtures, and deployment constructor arguments together. Preserve both-token pair validation and reserve ordering.
4. Keep raw output quantities in token base units. Use the token's decimals only at display boundaries. Tokens with custom transfer fees require separate execution analysis before adopting this minimum-output pattern.
5. Review policy constants in both frontend and contract. These contract constants are not editable after deployment; redeploy and point the frontend to the new guard if they change.
6. Add exact unit, reversed-pair, missing-pool, association-failure, and wallet calldata tests for the new route. Confirm a separately approved small testnet transaction and publish its receipt.

Preserve the direct `msg.sender` recipient and avoid adding arbitrary calldata, token approvals, custody, or an admin withdrawal path as an incidental route change. Mainnet use requires a separately reviewed configuration and deployment; the shipped frontend and deploy script intentionally select testnet.

## Reproduce validation

Use the root README's unit, API, browser, lint, and build commands. Browser fixtures live only under `packages/nextjs/e2e`, contain no key, and intercept network responses in the test browser. They are never a fallback in the live app. The recorded SDK association, contract deployment, and swap are separate evidence in [TESTNET_PROOF.md](TESTNET_PROOF.md).
