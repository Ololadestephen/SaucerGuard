import { expect } from "chai";
import { ethers } from "hardhat";

describe("GuardedSaucerSwap", function () {
  async function fixture() {
    const [trader] = await ethers.getSigners();
    const mock = await ethers.deployContract("MockSaucerRouter");
    await mock.waitForDeployment();
    const whbar = "0x0000000000000000000000000000000000003ad2";
    const sauce = "0x0000000000000000000000000000000000120f46";
    const guard = await ethers.deployContract("GuardedSaucerSwap", [await mock.getAddress(), whbar, sauce]);
    await guard.waitForDeployment();
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    return { trader, mock, guard, now };
  }

  it("routes a guarded swap directly to the trader", async function () {
    const { trader, mock, guard, now } = await fixture();
    await expect(guard.execute(200n, 198n, now, now + 60, { value: 100n }))
      .to.emit(guard, "GuardedSwapExecuted")
      .withArgs(trader.address, 100n, 200n, 200n, 198n, 200n);
    expect(await mock.lastRecipient()).to.equal(trader.address);
    expect(await mock.lastValue()).to.equal(100n);
  });

  it("rejects stale and future-dated quotes", async function () {
    const { guard, now } = await fixture();
    await expect(guard.execute(200n, 198n, now - 31, now + 60, { value: 100n })).to.be.revertedWithCustomError(
      guard,
      "QuoteExpired",
    );
    await expect(guard.execute(200n, 198n, now + 60, now + 120, { value: 100n })).to.be.revertedWithCustomError(
      guard,
      "QuoteExpired",
    );
  });

  it("rejects excessive slippage and deadlines", async function () {
    const { guard, now } = await fixture();
    await expect(guard.execute(200n, 193n, now, now + 60, { value: 100n })).to.be.revertedWithCustomError(
      guard,
      "SlippageTooWide",
    );
    await expect(guard.execute(200n, 198n, now, now + 600, { value: 100n })).to.be.revertedWithCustomError(
      guard,
      "InvalidDeadline",
    );
  });

  it("rejects a moved quote before submitting to the router", async function () {
    const { mock, guard, now } = await fixture();
    await mock.setRate(1);
    await expect(guard.execute(200n, 198n, now, now + 60, { value: 100n })).to.be.revertedWithCustomError(
      guard,
      "QuoteMoved",
    );
    expect(await mock.lastValue()).to.equal(0n);
  });

  it("rejects zero and over-cap input", async function () {
    const { guard, now } = await fixture();
    await expect(guard.execute(200n, 198n, now, now + 60)).to.be.revertedWithCustomError(guard, "InvalidAmount");
    await expect(guard.execute(200n, 198n, now, now + 60, { value: 1_000_000_001n })).to.be.revertedWithCustomError(
      guard,
      "InvalidAmount",
    );
  });
});
