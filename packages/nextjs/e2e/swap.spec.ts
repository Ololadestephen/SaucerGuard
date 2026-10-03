import { guardedSwapAbi, htsAssociationAbi } from "../lib/saucer/abi";
import { SAUCE_ADDRESS } from "../lib/saucer/config";
import { FIXTURE_HASH, GUARD_ADDRESS, connectFixtureWallet, installFixture, submittedTransactions } from "./fixture";
import { expect, test } from "@playwright/test";
import { decodeFunctionData } from "viem";

test("reviewed 0.1 HBAR signs exact calldata and wallet value, then links the confirmed receipt", async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("textbox", { name: "HBAR amount" }).fill("0.1");
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeEnabled();
  await page.getByRole("button", { name: "2 · Sign guarded swap" }).click();
  await expect(page.getByRole("link", { name: "View transaction proof" })).toHaveAttribute(
    "href",
    `https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${FIXTURE_HASH}`,
  );
  const [transaction] = await submittedTransactions(page);
  expect(transaction.to.toLowerCase()).toBe(GUARD_ADDRESS.toLowerCase());
  expect(BigInt(transaction.value)).toBe(100_000_000_000_000_000n);
  const decoded = decodeFunctionData({ abi: guardedSwapAbi, data: transaction.data as `0x${string}` });
  expect(decoded.functionName).toBe("execute");
  expect(decoded.args?.[0]).toBe(5_490_000n);
  expect(decoded.args?.[1]).toBe(5_435_100n);
  expect(BigInt(decoded.args?.[3] ?? 0) - BigInt(decoded.args?.[2] ?? 0)).toBe(120n);
  expect(fixture.pinnedQuoteReads.length).toBeGreaterThan(0);
  expect(fixture.pinnedQuoteReads.every(block => block === "0x2a")).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("unknown association prevents signing even when a quote exists", async ({ page }) => {
  await installFixture(page, { associated: null });
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByText("Association could not be verified; execution stays disabled.")).toBeVisible();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeDisabled();
  expect(await submittedTransactions(page)).toEqual([]);
});

test("a wallet on the wrong network cannot sign", async ({ page }) => {
  await installFixture(page, { chainId: 295 });
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByText("Execution locked: Switch your wallet to Hedera testnet")).toBeVisible();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeDisabled();
  expect(await submittedTransactions(page)).toEqual([]);
});

test("a quote expires while the user is reviewing it", async ({ page }) => {
  await installFixture(page);
  await page.clock.install();
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeEnabled();
  await page.clock.fastForward(31_000);
  await expect(page.getByText("Execution locked: Quote expired. Refresh it before signing")).toBeVisible();
  expect(await submittedTransactions(page)).toEqual([]);
});

test("quote deterioration during preflight never reaches the wallet", async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeEnabled();
  fixture.deteriorate = true;
  await page.getByRole("button", { name: "2 · Sign guarded swap" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The quote moved or expired" })).toBeVisible();
  expect(await submittedTransactions(page)).toEqual([]);
});

test("an incorrectly configured guard is refused before signing", async ({ page }) => {
  await installFixture(page, { wrongGuard: true });
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeEnabled();
  await page.getByRole("button", { name: "2 · Sign guarded swap" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Configured guard is not wired" })).toBeVisible();
  expect(await submittedTransactions(page)).toEqual([]);
});

test("wallet rejection leaves the swap unconfirmed", async ({ page }) => {
  await installFixture(page, { rejectSignature: true });
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeEnabled();
  await page.getByRole("button", { name: "2 · Sign guarded swap" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /rejected/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "View transaction proof" })).toHaveCount(0);
  expect(await submittedTransactions(page)).toEqual([]);
});

test("a reverted receipt is never displayed as a successful swap", async ({ page }) => {
  await installFixture(page, { reverted: true });
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeEnabled();
  await page.getByRole("button", { name: "2 · Sign guarded swap" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The on-chain swap reverted" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View transaction proof" })).toHaveCount(0);
});

test("HTS association requests the fixed SAUCE facade, then requires mirror verification", async ({ page }) => {
  await installFixture(page, { associated: false });
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Associate SAUCE with your wallet" }).click();
  await expect(page.getByRole("link", { name: "View association proof" })).toBeVisible();
  await expect(page.getByText("verified ✓", { exact: true })).toBeVisible();
  const [transaction] = await submittedTransactions(page);
  expect(transaction.to.toLowerCase()).toBe(SAUCE_ADDRESS.toLowerCase());
  expect(BigInt(transaction.value ?? "0x0")).toBe(0n);
  expect(decodeFunctionData({ abi: htsAssociationAbi, data: transaction.data as `0x${string}` }).functionName).toBe(
    "associate",
  );
});

test("a failing HTS response code prevents an association signature", async ({ page }) => {
  await installFixture(page, { associated: false, associationCode: 125n });
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Associate SAUCE with your wallet" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "HTS association refused with response code 125" }),
  ).toBeVisible();
  expect(await submittedTransactions(page)).toEqual([]);
});

test("an association receipt cannot unlock a swap while the mirror still reports it absent", async ({ page }) => {
  const fixture = await installFixture(page, { associated: false, mirrorLag: true });
  await page.goto("/");
  await connectFixtureWallet(page);
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeDisabled();
  await page.getByRole("button", { name: "Associate SAUCE with your wallet" }).click();
  await expect(page.getByRole("link", { name: "View association proof" })).toBeVisible();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeDisabled();
  fixture.associated = true;
  await page.getByRole("button", { name: "Recheck token association" }).click();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeEnabled();
  expect((await submittedTransactions(page)).length).toBe(1);
});

test("an unavailable RPC cannot become a usable quote", async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto("/");
  await connectFixtureWallet(page);
  fixture.rpcUnavailable = true;
  await page.getByRole("button", { name: "Get live SaucerSwap quote" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /503|HTTP request failed/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "2 · Sign guarded swap" })).toBeDisabled();
  expect(await submittedTransactions(page)).toEqual([]);
});
