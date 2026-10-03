# Troubleshooting

Start with Node 22 LTS, Yarn 3.2.3 via Corepack, and the root README. Read-only quotes need neither a wallet key nor a WalletConnect project ID.

| Symptom | Meaning | Next action |
| --- | --- | --- |
| No guard configured | `NEXT_PUBLIC_GUARD_ADDRESS` was absent or invalid at startup/build | Copy the frontend `.env.example` to `.env.local`, then restart the development server or rebuild production. The example contains a public testnet guard. |
| Wrong guard identities | The configured contract does not match the fixed router/token route | Check the EVM address and constructor values. Never suppress this check to continue. |
| Wrong wallet network | The connected wallet reports a chain other than 296 | Switch MetaMask to Hedera testnet. The app's quote client reads testnet regardless of wallet network. |
| SAUCE not associated | A valid mirror response does not list token `0.0.1183558` | Use the app's association action and review its separate wallet request, or associate through your wallet tools. |
| Association unverified | Mirror timeout, HTTP error, or malformed response | Wait and recheck. This status is different from absent association; neither allows a swap. |
| Association confirmed but still absent | Mirror indexing may lag the transaction receipt | Select **Recheck token association** after a short wait. The app does not mark a transfer-ready account solely from a transaction hash. |
| HTS response code is not 22 | The simulated native association did not report success | Confirm account funding, token identity, account limits, and whether it is already associated. Recheck before trying again. |
| Quote expired during wallet review | The quoted block is older than 30 seconds | Refresh, review the updated receive amount, and sign promptly. A slow wallet may cause an on-chain refusal and consume a network fee. |
| Quote moved | Router output deteriorated more than 1% | Obtain another quote and decide whether to proceed with its new terms. |
| Price impact exceeds 3% | The reserve-based impact including fee crosses the frontend policy | Reduce the input and request another quote. The current pool may not support that size. |
| Missing pool or unusable reserves | The fixed testnet pair does not provide usable liquidity | Wait or investigate the protocol deployment. Fixtures are never used to continue a live trade. |
| Confirmed block/RPC unavailable | The endpoint cannot serve a consistent quote snapshot | Retry later or configure a compatible public `NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL`, then restart/rebuild. The endpoint must support block-number contract reads. |
| Wallet rejects the request | No transaction was approved | Review the inputs and request again only if intended. No success message should appear. |
| Swap receipt reverted | The chain refused the execution; a network fee may still apply | Inspect the result link/error, refresh quote and association, and review conditions before another attempt. |
| Account cannot sign through MetaMask | It may be a native Ed25519 account rather than an ECDSA EVM account | Use an ECDSA testnet account compatible with the injected-wallet flow. Do not paste keys into the app or chat. |
| WalletConnect unavailable | The inherited scaffold fallback project may not work for your deployment | Set your own public WalletConnect project ID or use injected MetaMask. |
| Browser tests cannot find Chromium | Playwright's browser binary is not installed | Run `yarn workspace @sh/nextjs playwright install chromium`, or use `PLAYWRIGHT_BROWSER_CHANNEL=chrome` with installed Google Chrome. |
| Browser test server cannot start | Playwright builds the public-guard test configuration before starting `next start` | Resolve the build error or free port 3007. Browser tests are explicit development checks, not part of application startup. |
| Deploy refuses a local or mainnet network | This guard's script is testnet-only | Run the documented `hederaTestnet` command. Unit tests deploy their own local fixtures directly. |

Public RPC and mirror services can fail or rate-limit. Describe the failure and keep execution disabled rather than turning missing evidence into a green check. For policy ownership and units, see [BUILDER_GUIDE.md](BUILDER_GUIDE.md).
