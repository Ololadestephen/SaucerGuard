# Full project plan

## Product

SaucerGuard is a reusable DeFi starter for builders who need a defensible quote-to-execution path, rather than a bare swap button. A developer gets a Hedera-native example of how a wallet, HTS association, an AMM router, pool-reserve inspection, an on-chain policy wrapper, and transaction proof fit together.

The first supported route is fixed: native testnet HBAR → testnet SAUCE through SaucerSwap V1. This is deliberate. An arbitrary-token router would need token metadata, fees, route validation, association behavior, and liquidity controls that are not yet demonstrated.

## User journey

1. Enter an amount. The parser rejects zero, scientific notation, more than eight HBAR decimals, and values over 10 HBAR.
2. Read the current router quote and actual pool reserves. Show quoted output, slippage floor, approximate price impact plus fee, pair identity, and age.
3. Connect a chain-296 wallet. Confirm testnet SAUCE association from the mirror node. If the association is absent, simulate and request a wallet-signed HRC-719 `associate()` call on the fixed SAUCE facade. Recheck the mirror node after confirmation; fail closed while its result is unknown.
4. On click, confirm the deployed guard identity and re-read the quote. Refuse if it deteriorated over 1% or crosses the 3% price-impact policy.
5. The wallet signs a payable call to the guard. The contract itself rechecks amount, quote age, quote deterioration, slippage floor, route and deadline, then forwards to SaucerSwap with the user's address as recipient.
6. Surface the transaction hash and mirror-node proof. Never report success on a reverted receipt.

## Contracts and data model

`GuardedSaucerSwap` has immutable `router`, `wrappedHbar`, and `outputToken`. It has no admin, oracle, mutable price, approval, token balances by design, or withdrawal method. `execute(quotedOutput, minimumOutput, quotedAt, deadline)` is the sole state-changing entry point. The source of truth for output is SaucerSwap's V1 router. The policy ceilings are constants; changing them requires a reviewed redeployment.

The frontend quote is an ephemeral observation, not a promise. Its core fields are amount in tinybars, router output in SAUCE base units, block timestamp, reserve-derived impact, and pair address. No quote is persisted or fabricated. A successful receipt is a chain transaction, not a local estimate.

## Phase gates

| Gate | Definition of done |
| --- | --- |
| 1. Scaffold | External-template `template.json`, monorepo, README, AGENTS, MIT notices, ignored local state. |
| 2. Live integration | Router/factory/pair calls return authentic testnet data. No API key. Errors fail closed. |
| 3. Guard | Contract passes positive and adversarial unit tests, including timing, size, drift, slippage, recipient. |
| 4. UI | Quote review, association, wallet chain, guard identity, explicit refusal and mirror receipt. Responsive layout. |
| 5. Release | Install/lint/build/test clean on Node 22; fresh CLI scaffold from public repo; core routes return OK; secret scan. |
| 6. Chain proof | Funded testnet wallet deploys the guard and performs one bounded swap. Add verified Hashscan/mirror link. No fabricated proof. |
| 7. Submission | Public MIT repo, tested `owner/repo` command, proof link, dev-ex survey, final README. |

## Risks and deliberate exclusions

- SaucerSwap V1 testnet liquidity may move or disappear. The UI must refuse rather than replace the quote with mocked data.
- HTS token association is account-specific; without it the swap may revert. Mirror-node timeout is a locked state, not a green signal.
- A 30-second quote limit may be tight for a slow wallet. That is an intentional safety tradeoff; users can refresh.
- Pool reserve impact is an approximate baseline including the V1 fee, not execution slippage or an oracle price.
- This starter does not support mainnet, V2/V3 routing, token→token, token approvals, aggregator search, price oracles, batching, automated trading, or orderbook fills.
- Association, guard deployment, and a 0.1-HBAR guarded swap are verified in [TESTNET_PROOF.md](TESTNET_PROOF.md). These transactions used a local ECDSA signer. The browser test suite uses isolated wallet/RPC fixtures; its hashes and responses are not historical chain evidence.
- The newly added HRC-719 browser association action has fixture coverage. The recorded real association used a native SDK transaction; it does not establish a live HRC-719 browser call.
