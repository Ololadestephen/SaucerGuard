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

The quote is read directly from [SaucerSwap V1 router `0.0.19264`](https://hashscan.io/testnet/contract/0.0.19264). The app also checks router WHBAR, discovers the WHBAR/SAUCE pair through the router's factory, and reads reserves to show an approximate pool price-impact-plus-fee figure. All quote failures are visible; there are no fabricated fallback prices.

## Enable the guarded testnet swap

1. Fund an ECDSA-compatible Hedera testnet wallet via the [Hedera Portal faucet](https://portal.hedera.com/faucet). Associate testnet SAUCE token [`0.0.1183558`](https://hashscan.io/testnet/token/0.0.1183558) with that wallet. The app verifies association through the testnet mirror node.
2. Copy `packages/nextjs/.env.example` to `packages/nextjs/.env.local` and restart `yarn next:dev`. The example contains the [public, verified testnet guard](https://testnet.mirrornode.hedera.com/api/v1/contracts/0.0.10841001); it contains no key.
3. Connect the funded wallet on chain 296, refresh the association check, get a quote, and review the minimum output. A signed swap is limited to 10 HBAR and may revert if the pool moves or the quote expires.

To deploy your **own** guard instead, copy `packages/hardhat/.env.example` to a local `.env`, use the scaffold account import/generation flow, review the source and fees, and deploy:

```bash
yarn hardhat:deploy --network hederaTestnet --tags GuardedSaucerSwap
```

Then replace `NEXT_PUBLIC_GUARD_ADDRESS` in `packages/nextjs/.env.local` with your deployment address and restart the app. Never put a wallet key in chat, Git, or a `NEXT_PUBLIC_` variable.

The frontend checks that the configured guard actually points to the expected router, WHBAR, and SAUCE addresses before asking for a signature. After a successful transaction it links to the Hedera testnet mirror-node contract result. To change assets or support mainnet, audit and redeploy deliberately; do not reuse this testnet configuration.

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

## Architecture

```text
User + testnet wallet
  │
  ├─ read-only RPC → SaucerSwap router → factory → WHBAR/SAUCE reserves
  ├─ read-only mirror node → SAUCE HTS association
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

## Current proof status

On October 3, 2026, the guard was [deployed on Hedera testnet](https://testnet.mirrornode.hedera.com/api/v1/contracts/results/0x695c9b3b93b747d9bc9b7d49fde0301c6925d7f320057e082db883703ac28038), and a [guarded 0.1-HBAR swap succeeded](https://testnet.mirrornode.hedera.com/api/v1/contracts/results/0x304233b8a960dd00c49e1393bdaf98031b6f53829679ecea52eb3e65fdc7f28a), delivering 5.408280 SAUCE directly to the trader. These are historical testnet observations, **not a current quote, a fill guarantee, or a browser-wallet test**. See [the complete proof and limitations](docs/TESTNET_PROOF.md).

## Third-party work and licence

Generated baseline: [Scaffold-HBAR](https://github.com/hedera-dev/scaffold-hbar), MIT, with its original notices retained in `LICENCE`. Protocol integration: [SaucerSwap V1 periphery](https://github.com/saucerswaplabs/saucerswap-periphery), referenced by interface only; no protocol contract code was copied. Runtime and tooling are listed in the workspace `package.json` files and `yarn.lock`. The guard, quote policy, tests, and product UI are original template code. No API key or private key belongs in the repository.
