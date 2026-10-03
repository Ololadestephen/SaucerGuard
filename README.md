# SaucerGuard

A Scaffold-HBAR template for a **guarded HBAR → SAUCE swap on Hedera testnet**. The app reads a live SaucerSwap V1 router quote and pool reserves, checks HTS token association, and displays a deterministic policy decision. An optional deployed `GuardedSaucerSwap` contract enforces the fixed route, size cap, quote freshness, quote drift, slippage ceiling, and deadline before forwarding the trade to SaucerSwap. Output goes directly to the trader; the guard does not custody SAUCE.

SaucerGuard is an independent community template, not an official SaucerSwap product.

This is a developer starter, not a recommendation to trade or a guarantee of execution. It is restricted to testnet. It does not place a transaction until a wallet owner explicitly signs.

## One-command scaffold

From this public repository:

```bash
npm create scaffold-hbar@latest -- --template Ololadestephen/SaucerGuard
```

The project was built on the official Scaffold-HBAR blank template. The manifest limits this variant to Next.js, Hardhat, and Yarn. Node.js 20.18.3+ is required; Node 22 LTS is recommended. Do not use Node 25 for release verification.

The command above was run against the public repository on October 3, 2026; install, tests, lint, build, and core route checks passed. See [testnet and scaffold evidence](docs/TESTNET_PROOF.md).

## Try the read-only app

```bash
corepack enable
yarn install
yarn next:dev
```

Open http://localhost:3000. Enter an HBAR amount (up to 10), then select **Get live SaucerSwap quote**. This works without an account or key. The swap button remains locked until a verified testnet guard is configured, an EVM-compatible testnet wallet is connected, and testnet SAUCE is associated.

The quote is read directly from [SaucerSwap V1 router `0.0.19264`](https://hashscan.io/testnet/contract/0.0.19264). All router, factory, pair-token, and reserve reads use the same confirmed block; the UI displays that block number. The app checks both pool tokens and rounds the approximate price-impact-plus-fee figure upward before applying its cap. All quote failures are visible; there are no fabricated fallback prices.

## Enable the guarded testnet swap

1. Fund an ECDSA-compatible Hedera testnet wallet via the [Hedera Portal faucet](https://portal.hedera.com/faucet). For an injected wallet, use MetaMask on Hedera testnet; native Ed25519 accounts require a wallet integration that this starter does not provide.
2. Copy `packages/nextjs/.env.example` to `packages/nextjs/.env.local` and restart `yarn next:dev`. The example contains the [public, verified testnet guard](https://testnet.mirrornode.hedera.com/api/v1/contracts/0.0.10841001); it contains no key.
3. Connect the funded wallet on chain 296. When the mirror node confirms that SAUCE is absent, click **Associate SAUCE with your wallet** and review the separate wallet transaction. The app simulates the fixed token's HRC-719 call and requires HTS success code 22 before asking for a signature. After confirmation, recheck association if the mirror node is still indexing it. You can also associate [`0.0.1183558`](https://hashscan.io/testnet/token/0.0.1183558) through your existing wallet tools.
4. Get a quote, review the amount and minimum receive, then select **Sign guarded swap**. Refresh if the quote expires before confirmation. A signed swap is limited to 10 HBAR and may revert if the pool moves or the quote expires.

Injected MetaMask does not require a WalletConnect project ID. To offer WalletConnect in your own app, set your own public `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`; the inherited scaffold fallback is not a credential or service commitment for your deployment. See [troubleshooting](docs/TROUBLESHOOTING.md) for common setup failures.

The inherited burner-wallet connector is disabled by default. You explicitly choose your wallet; the starter does not create and auto-connect a development account on first load.

To deploy your **own** guard instead, copy `packages/hardhat/.env.example` to a local `.env`, use the scaffold account import/generation flow, review the source and fees, and deploy:

```bash
yarn hardhat:deploy --network hederaTestnet --tags GuardedSaucerSwap
```

Then replace `NEXT_PUBLIC_GUARD_ADDRESS` in `packages/nextjs/.env.local` with your deployment address and restart the app. Never put a wallet key in chat, Git, or a `NEXT_PUBLIC_` variable.

The frontend checks that the configured guard actually points to the expected router, WHBAR, and SAUCE addresses before asking for a signature. After a successful transaction it links to the Hedera testnet mirror-node contract result. Follow the [builder guide](docs/BUILDER_GUIDE.md) to understand the units, trust boundaries, and changes needed for another asset.

## Reproduce the checks

```bash
yarn hardhat:compile
yarn hardhat:test
yarn workspace @sh/nextjs test
yarn workspace @sh/nextjs verify:testnet-read
yarn next:check-types
yarn lint
yarn next:build
```

Run with Node 22 LTS for the Next.js production build. The generated scaffold may have unrelated formatting warnings; new code should be formatted before release. The local Hardhat unit tests use a mock router and spend no HBAR. The frontend tests exercise exact amount arithmetic and fail-closed decisions.

Browser regression tests build and start a production app with the public testnet guard configured, then use an isolated fixture wallet, fixture RPC, and fixture mirror responses:

```bash
yarn workspace @sh/nextjs playwright install chromium
yarn next:test:e2e
```

If Google Chrome is already installed, `PLAYWRIGHT_BROWSER_CHANNEL=chrome yarn next:test:e2e` uses it instead. The suite covers desktop and mobile layouts, exact transaction value/calldata, quote expiry and drift, wrong network/guard, unknown association, wallet rejection, reverted receipts, and HTS association. Fixture results are distinct from the real transactions in [testnet proof](docs/TESTNET_PROOF.md). No test imports a wallet key or broadcasts a transaction.

## Architecture

```text
User + testnet wallet
  │
  ├─ read-only RPC → SaucerSwap router → factory → WHBAR/SAUCE reserves
  ├─ read-only mirror node → SAUCE HTS association
  ├─ signed association → SAUCE token facade → native HTS association → mirror recheck
  └─ signed tx → GuardedSaucerSwap → SaucerSwap V1 router → SAUCE direct to user
                              │
                              └─ GuardedSwapExecuted event + mirror-node proof
```

- `packages/nextjs/lib/saucer`: verified IDs, ABI, exact integer input/guard arithmetic, live quote adapter.
- `packages/nextjs/app/page.tsx`: quote review and wallet-signed execution; it will not bypass a failed preflight.
- `packages/nextjs/app/api/token-association`: fail-closed testnet mirror-node check.
- `packages/hardhat/contracts/GuardedSaucerSwap.sol`: on-chain enforcement; immutable router and token route, no owner withdrawal or token custody.
- `packages/hardhat/test/GuardedSaucerSwap.test.ts`: positive path and boundary/refusal tests.

See [the implementation plan](docs/PLAN.md), [security notes](docs/SECURITY.md), and [testnet proof checklist](docs/TESTNET_PROOF.md).

For a new builder: [how the pattern works and how to adapt it](docs/BUILDER_GUIDE.md) · [troubleshooting](docs/TROUBLESHOOTING.md) · [contract development and deployment](packages/hardhat/README.md) · [release validation: 59 behavior checks](docs/VALIDATION.md).

## Current proof status

On October 3, 2026, the guard was [deployed on Hedera testnet](https://testnet.mirrornode.hedera.com/api/v1/contracts/results/0x695c9b3b93b747d9bc9b7d49fde0301c6925d7f320057e082db883703ac28038), and a [guarded 0.1-HBAR swap succeeded](https://testnet.mirrornode.hedera.com/api/v1/contracts/results/0x304233b8a960dd00c49e1393bdaf98031b6f53829679ecea52eb3e65fdc7f28a), delivering 5.408280 SAUCE directly to the trader. Sourcify subsequently returned `exact_match` for the [deployed contract source](https://sourcify.dev/server/v2/contract/296/0xC18620A757AF927BC758Fe279b8C8Ba2340c260A). These are historical testnet observations, **not a current quote, a fill guarantee, or a live browser-wallet test**. See [the complete proof and limitations](docs/TESTNET_PROOF.md).

## Third-party work and licence

Generated baseline: [Scaffold-HBAR](https://github.com/hedera-dev/scaffold-hbar), MIT, with its original notices retained in `LICENCE`. Protocol integration: [SaucerSwap V1 periphery](https://github.com/saucerswaplabs/saucerswap-periphery), referenced by interface only; no protocol contract code was copied. Runtime and tooling are listed in the workspace `package.json` files and `yarn.lock`. The guard, quote policy, tests, and product UI are original template code. No API key or private key belongs in the repository.

The association ABI follows [HRC-719](https://github.com/hiero-ledger/hiero-improvement-proposals/blob/main/HIP/hip-719.md). Browser tests use [Playwright](https://playwright.dev/), a development-only dependency. Development was AI-assisted; public transaction claims are backed by the linked mirror-node records.
