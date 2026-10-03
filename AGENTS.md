# SaucerGuard — agent instructions

This repository is a Scaffold-HBAR community template. Read `README.md`, `template.json`, `docs/PLAN.md`, and `docs/SECURITY.md` before changing swap behavior.

## Non-negotiable boundaries

- Testnet only. Chain ID 296; SaucerSwap V1 router `0.0.19264`, WHBAR `0.0.15058`, SAUCE `0.0.1183558`. Verify IDs against chain data before changing them.
- Never invent quotes, transaction hashes, token associations, deployments, or testnet proof.
- Never use a wallet key without explicit user authorization for that specific deployment or transaction. Never print, commit, or paste keys.
- Keep router/token addresses immutable in the guard. Do not add an admin withdrawal path or arbitrary destination.
- Treat `msg.value` on Hedera Solidity as tinybars, while EVM-wallet transaction `value` is expressed in weibars. Preserve the 8↔18-decimal boundary and test it.
- Failed RPC, mirror-node, missing pool, stale data, wrong chain, unassociated token, or excessive price impact must disable execution.

## Project layout

- Hardhat contracts, deploy scripts, tests: `packages/hardhat`.
- Next.js App Router, wallet UI, live quote and policy: `packages/nextjs`.
- Node 22 LTS and Yarn 3.2.3. Use the existing workspace scripts.
- The contracts package unit tests run on local Hardhat without a fork. `HEDERA_FORKING=true` is only for explicit fork workflows.
- The on-chain guard forwards output directly to the user; the frontend rechecks the live quote before signing; the contract is authoritative.

## Coding quality

Apply the user's Desloppify policy. `.desloppify/` and `scorecard.png` are local and ignored. Scan the smallest coherent workspace (`packages/nextjs` or `packages/hardhat`), review `status` and `next`, and rescan after meaningful code changes. Do not game the score or refactor unrelated scaffold internals merely to clear findings.

Before shipping: format touched files, run `yarn hardhat:test`, `yarn workspace @sh/nextjs test`, `yarn next:check-types`, `yarn lint`, and `yarn next:build`. Verify a clean scaffold from the public repository. No testnet transaction is proven until a mirror-node or Hashscan link is recorded in `docs/TESTNET_PROOF.md`.
