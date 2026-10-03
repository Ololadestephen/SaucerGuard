# Release validation — October 3, 2026

These are observed checks, not an independent security audit or a claim about future fills. Run the commands with Node 22 LTS and Yarn 3.2.3.

## Automated behavior checks

| Suite | Result | Evidence boundary |
| --- | --- | --- |
| `yarn hardhat:test` | 18 passed | Local Solidity execution with a mock router; no HBAR spent |
| `yarn workspace @sh/nextjs test` | 17 passed | Exact integer arithmetic, pinned quote reads, mirror/API failures |
| `PLAYWRIGHT_BROWSER_CHANNEL=chrome yarn next:test:e2e` | 24 passed | Twelve scenarios on desktop and mobile; isolated fixture provider and intercepted RPC/mirror responses |
| `yarn next:check-types` and `yarn hardhat:check-types` | Passed | TypeScript checks in both workspaces |
| `yarn lint` | Passed | No ESLint warnings/errors; Next's inherited lint command emits a deprecation notice |
| Browser suite production build | Passed | Test configuration is built by Playwright before its server starts |

The contract suite checks valid execution, invalid immutable configuration, zero/over-cap input, exact ten-HBAR input, quote-age/deadline boundaries, one-percent deterioration, three-percent minimum-output policy, malformed router responses, and rollback after an invalid swap response.

The browser suite checks reviewed calldata and wallet value, unknown association, wrong chain, quote expiry, deteriorated quote, wrong guard, signature rejection, reverted receipts, association success, non-success HTS codes, mirror indexing lag, and unavailable RPC. No browser test loads a private key or sends a real blockchain transaction. Fixture transaction hashes are only test values; the live application has no fixture fallback.

The repository CI runs both unit suites, both type checks, lint, and the self-building browser suite. Failure traces are retained for seven days. The workflow needs read-only repository permissions and no wallet secret. Its configuration is committed; a local pass is not a claim that a hosted CI run has passed.

## External integration evidence

- The read-only adapter returned a live testnet quote with all contract reads pinned to block `41303488`: one HBAR, `54,082,039` SAUCE base units, rounded impact plus fee of 31 bps.
- Sourcify returned `exact_match` for the existing deployed guard. The deployed guard source was not changed during hardening.
- The earlier native SDK association, guard deployment, and 0.1-HBAR swap are recorded with public receipts in [TESTNET_PROOF.md](TESTNET_PROOF.md). The new browser HRC-719 association path has fixture coverage, not a separately signed live-browser proof.
- Hardening and source verification spent no additional HBAR.

## Code-health review

Desloppify was used separately for the Next.js and Hardhat workspaces. Generated contracts, dependencies, build output, browser reports, and caches were excluded; production application source was not excluded. The focused findings concerned inconsistent quote blocks, missing wallet/mirror boundary tests, and missing router/policy boundary tests. Each was fixed and resolved after verification.

Scanner scores are not the bounty rubric. Its unassessed subjective dimensions and incomplete analyzer coverage prevent treating the strict score as a complete assessment. Remaining inherited scaffold findings are not concealed by suppressions or `wontfix` decisions. Scanner state is local and gitignored.

## Reviewer route

1. Follow [README.md](../README.md) for the public scaffold command and read-only startup.
2. Run the unit/API checks above; run browser fixtures with an installed Playwright Chromium or Google Chrome.
3. Read [BUILDER_GUIDE.md](BUILDER_GUIDE.md) for the unit conversions, frontend-versus-contract policy, and safe adaptation steps.
4. Inspect [SECURITY.md](SECURITY.md) and the linked public transaction/source records.

Test results establish those tested behaviors only. They do not imply every wallet, custom-fee token, protocol version, or mainnet deployment is supported.
