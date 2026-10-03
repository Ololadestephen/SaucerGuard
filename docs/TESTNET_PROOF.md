# Hedera testnet proof

Status: **VERIFIED ON TESTNET** for one SAUCE association, one guard deployment, and one guarded HBAR→SAUCE swap on October 3, 2026. This proves those specific transactions, not future fills or frontend-wallet compatibility.

## Public evidence

| Step | Verified result | Public record |
| --- | --- | --- |
| Associate SAUCE | `TOKENASSOCIATE` `SUCCESS` for account `0.0.9831825` and token `0.0.1183558`; fee 0.49581858 HBAR | [Mirror transaction](https://testnet.mirrornode.hedera.com/api/v1/transactions/0.0.9831825-1791025630-384283418) |
| Deploy guard | `SUCCESS`, contract `0.0.10841001`, EVM address `0xC18620A757AF927BC758Fe279b8C8Ba2340c260A`, 543,350 gas; fee 0.456414 HBAR | [Mirror result](https://testnet.mirrornode.hedera.com/api/v1/contracts/results/0x695c9b3b93b747d9bc9b7d49fde0301c6925d7f320057e082db883703ac28038) · [contract](https://testnet.mirrornode.hedera.com/api/v1/contracts/0.0.10841001) |
| Execute guarded swap | `SUCCESS`, 0.1 HBAR input, 5.408280 SAUCE output, 166,585 gas; fee 0.13993140 HBAR | [Mirror result](https://testnet.mirrornode.hedera.com/api/v1/contracts/results/0x304233b8a960dd00c49e1393bdaf98031b6f53829679ecea52eb3e65fdc7f28a) |

The deployment's immutable reads were checked on-chain: router `0.0.19264`, WHBAR `0.0.15058`, and SAUCE `0.0.1183558`. The deployed guard has no owner or withdrawal path.

The swap's decoded `GuardedSwapExecuted` event records trader `0x8C0419295A7b467d8aD14E10418c4b15C00Bf6F7`, input `10,000,000` tinybars, reviewed and fresh output `5,408,280` SAUCE base units, minimum `5,354,197`, and actual output `5,408,280`. The mirror node independently showed the trader's SAUCE balance increase from zero to `5,408,280` base units. SAUCE has six decimals on testnet.

The three transaction fees total **1.09216398 HBAR**; adding the 0.1-HBAR swap input gives a total wallet decrease of **1.19216398 testnet HBAR**. This was below the authorized **15 testnet-HBAR** total cap. No private key or wallet secret was copied into this repository or used in the frontend.

## Reproduction boundary

The read-only app and local tests remain runnable without a wallet. To try the existing public testnet guard, copy `packages/nextjs/.env.example` to `packages/nextjs/.env.local` and connect your own ECDSA testnet wallet after associating SAUCE. The configured guard address is public; its immutable identities are checked before the UI asks for a signature. To deploy your own guard, follow the README's encrypted-key Hardhat flow.

The transactions above were signed by a local ECDSA testnet signer, **not by clicking the browser UI**. This is a verified contract/protocol integration proof, not a claim that every browser wallet or future pool state has been tested. The browser regression suite uses a fixture provider and intercepted network responses. The new HRC-719 association action is fixture-tested; the recorded real association used the native SDK path. Quotes, pool liquidity, gas prices, and token association can change; the app must fail closed when a prerequisite is unavailable.

## Source verification and consistent quote reads

On October 3, 2026, the repository's Sourcify v2 command returned `exact_match` for `GuardedSaucerSwap` at `0xC18620A757AF927BC758Fe279b8C8Ba2340c260A` on chain 296. See the [Sourcify contract record](https://sourcify.dev/server/v2/contract/296/0xC18620A757AF927BC758Fe279b8C8Ba2340c260A) and [Hashscan contract](https://hashscan.io/testnet/contract/0xC18620A757AF927BC758Fe279b8C8Ba2340c260A). This matches deployed bytecode to the source/compiler input; it is not a security audit. Source verification submitted no blockchain transaction and spent no HBAR.

The updated read-only adapter was also checked against live testnet data: all router, factory, pair-token, and reserve calls were pinned to block `41303488` with timestamp `1791028870`. A one-HBAR input returned `54,082,039` SAUCE base units, with impact plus fee rounded up to 31 basis points. This is a historical observation, not a current price.

## Fresh public-template smoke test

On October 3, 2026, the exact command `npm create scaffold-hbar@latest -- --template Ololadestephen/SaucerGuard` created a fresh testnet project from the public repository in an isolated temporary directory. Its dependency install, five Hardhat tests, eight frontend tests, type-check, lint, and production build all passed on Node 22. The production server returned HTTP 200 for `/`, `/debug`, and `/blockexplorer`; an invalid token-association request correctly returned HTTP 400. This smoke test used the public commit before this proof document was added; it did not sign another transaction.

The exact command was repeated against signed hardening release `0d8bef6` later that day. Fresh dependency installation, 18 contract tests, 17 frontend/API tests, both type checks, lint, the production build, and all 24 desktop/mobile browser checks passed. Core routes again returned 200, and invalid association input returned 400. GitHub also completed the [release CI](https://github.com/Ololadestephen/SaucerGuard/actions/runs/37132791916) successfully. The subsequent dust-size reserve-ratio correction adds one frontend regression test; its local checks total 60 passing behaviors. Neither verification run signed a real transaction.
