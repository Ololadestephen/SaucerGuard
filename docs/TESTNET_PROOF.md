# Testnet transaction proof

Status: **PENDING — no deployment or swap transaction is claimed.**

Before submitting the bounty:

1. Deploy `GuardedSaucerSwap` on Hedera testnet with a funded ECDSA-compatible account.
2. Record the deployment EVM address and a public Hashscan or mirror-node deployment transaction link.
3. Verify the guard's router, WHBAR, and outputToken immutable reads against the documented IDs.
4. Associate testnet SAUCE `0.0.1183558` with the trading wallet and positively verify it through the mirror node.
5. Sign one small, explicitly approved HBAR→SAUCE swap. Verify receipt status, emitted `GuardedSwapExecuted`, and wallet SAUCE balance change.
6. Record the exact transaction link, input, minOut, actualOut, date/time, and network here. Do not record account keys.
7. Clone from the **public** repository via the exact external-template CLI command and rerun install/lint/build/boot checks.

Do not substitute local Hardhat hashes, a router read-only quote, or a direct HBAR transfer for this proof.
