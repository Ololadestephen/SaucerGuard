# SaucerGuard contracts

This workspace owns the guard, its local mock router, deployment, encrypted-account tools, and source-verification tools. Run the commands below from the repository root on Node 22 LTS.

## Local checks

```bash
yarn hardhat:compile
yarn hardhat:test
yarn hardhat:check-types
```

Tests deploy the guard and a mock router on an ephemeral Hardhat network. They do not need a fork, RPC, funded account, or key. Hardhat treats native value as ordinary EVM units in these tests; the wallet's 18-decimal value conversion is tested separately in the frontend, and the actual Hedera conversion is evidenced by the testnet receipt.

The guard deploy script intentionally refuses `hardhat`, `localhost`, and mainnet. Local tests deploy their own fixtures directly. Inherited `hardhat:chain` and `hardhat:fork` scripts can start a Hedera fork for exploration, but the release checks and guard deployment do not depend on them.

## Deploy your own guard on testnet

1. Copy `packages/hardhat/.env.example` to `packages/hardhat/.env`.
2. Create or import an ECDSA account using either command:

   ```bash
   yarn hardhat:account:generate
   yarn hardhat:account:import
   ```

   Run only the command appropriate for your account. The scripts prompt locally and store an encrypted wallet in the ignored `.env`. Do not share the password or commit that file.
3. Fund the account through the [testnet faucet](https://portal.hedera.com/faucet).
4. Review `contracts/GuardedSaucerSwap.sol`, then deploy:

   ```bash
   yarn hardhat:deploy --network hederaTestnet --tags GuardedSaucerSwap
   ```

   The wrapper asks for the decryption password locally. The deployment fixes router `0.0.19264`, WHBAR `0.0.15058`, and SAUCE `0.0.1183558`. Deployment spends testnet HBAR; it is not part of the test commands.
5. Set the new EVM address as `NEXT_PUBLIC_GUARD_ADDRESS` in `packages/nextjs/.env.local`, restart the frontend, and follow the root README's association and swap steps. The app checks the three immutable identities before signing.

You can use the existing public testnet guard from the root `.env.example` instructions if you only want to try the frontend. No deployer key is required for that option.

## Optional source verification

After your own deployment, the inherited Sourcify script can submit the local compiler build information and constructor arguments:

```bash
yarn hardhat:verify -- GuardedSaucerSwap testnet
```

It obtains the address and arguments from `packages/hardhat/deployments/hederaTestnet/GuardedSaucerSwap.json`. Source-verification service availability is independent of transaction success. A mirror-node success record alone is not a Sourcify source-verification claim.

## Layout and invariants

- `contracts/GuardedSaucerSwap.sol`: deployed guard; immutable route, caps, timing, minimum output, direct trader recipient.
- `contracts/mocks/MockSaucerRouter.sol`: local-test responses only; never deploy as the live router.
- `test/GuardedSaucerSwap.test.ts`: policy limits, invalid configuration, malformed responses, and atomic reverts.
- `deploy/00_deploy_guarded_saucer_swap.ts`: testnet-only deployment.
- `scripts/`: inherited account, ABI generation, and source-verification tools.

See [builder guide](../../docs/BUILDER_GUIDE.md) for tinybar/weibar conversion, adapting assets, and the caller-supplied quote trust boundary. No owner, token withdrawal path, arbitrary recipient, or arbitrary route belongs in this guard.
