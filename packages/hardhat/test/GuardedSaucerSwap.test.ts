import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

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

  it("rejects every invalid immutable configuration", async function () {
    const { mock } = await fixture();
    const router = await mock.getAddress();
    const whbar = "0x0000000000000000000000000000000000003ad2";
    const sauce = "0x0000000000000000000000000000000000120f46";
    const factory = await ethers.getContractFactory("GuardedSaucerSwap");
    for (const args of [
      [ethers.ZeroAddress, whbar, sauce],
      [router, ethers.ZeroAddress, sauce],
      [router, whbar, ethers.ZeroAddress],
      [router, whbar, whbar],
    ]) {
      await expect(factory.deploy(args[0], args[1], args[2])).to.be.revertedWithCustomError(
        factory,
        "InvalidConfiguration",
      );
    }
  });

  it("rejects zero reviewed output and minimum output", async function () {
    const { guard, now } = await fixture();
    for (const [quoted, minimum] of [
      [0n, 1n],
      [200n, 0n],
    ]) {
      await expect(guard.execute(quoted, minimum, now, now + 60, { value: 100n })).to.be.revertedWithCustomError(
        guard,
        "InvalidAmount",
      );
    }
  });

  it("accepts exactly ten HBAR in protocol tinybars", async function () {
    const { guard, now } = await fixture();
    const input = await guard.MAX_INPUT_TINYBARS();
    expect(input).to.equal(1_000_000_000n);
    await expect(guard.execute(input * 2n, input * 2n, now, now + 60, { value: input })).to.emit(
      guard,
      "GuardedSwapExecuted",
    );
  });

  it("accepts the exact quote-age limit and rejects one second beyond it", async function () {
    const { guard, now } = await fixture();
    await time.setNextBlockTimestamp(now + 30);
    await expect(guard.execute(200n, 198n, now, now + 60, { value: 100n })).to.emit(guard, "GuardedSwapExecuted");
    await time.setNextBlockTimestamp(now + 31);
    await expect(guard.execute(200n, 198n, now, now + 60, { value: 100n })).to.be.revertedWithCustomError(
      guard,
      "QuoteExpired",
    );
  });

  it("accepts the maximum deadline and rejects both expired and overlong deadlines", async function () {
    const { guard, now } = await fixture();
    const executionTime = now + 1;
    await time.setNextBlockTimestamp(executionTime);
    await expect(guard.execute(200n, 198n, now, executionTime + 300, { value: 100n })).to.emit(
      guard,
      "GuardedSwapExecuted",
    );
    await time.setNextBlockTimestamp(executionTime + 1);
    await expect(guard.execute(200n, 198n, now, executionTime, { value: 100n })).to.be.revertedWithCustomError(
      guard,
      "InvalidDeadline",
    );
    await time.setNextBlockTimestamp(executionTime + 2);
    await expect(guard.execute(200n, 198n, now, executionTime + 303, { value: 100n })).to.be.revertedWithCustomError(
      guard,
      "InvalidDeadline",
    );
  });

  it("accepts exactly one-percent quote deterioration but rejects one base unit more", async function () {
    const { mock, guard, now } = await fixture();
    await mock.setFractionalRate(198n, 100n);
    await expect(guard.execute(10_000n, 9_700n, now, now + 60, { value: 5_000n })).to.emit(
      guard,
      "GuardedSwapExecuted",
    );
    await mock.setFractionalRate(9_899n, 5_000n);
    await expect(guard.execute(10_000n, 9_700n, now, now + 60, { value: 5_000n })).to.be.revertedWithCustomError(
      guard,
      "QuoteMoved",
    );
  });

  it("accepts exactly three-percent slippage and rejects one base unit more", async function () {
    const { guard, now } = await fixture();
    await expect(guard.execute(10_000n, 9_700n, now, now + 60, { value: 5_000n })).to.emit(
      guard,
      "GuardedSwapExecuted",
    );
    await expect(guard.execute(10_000n, 9_699n, now, now + 60, { value: 5_000n })).to.be.revertedWithCustomError(
      guard,
      "SlippageTooWide",
    );
  });

  for (const mode of [1, 2, 3]) {
    it(`rejects malformed quote response mode ${mode} before trading`, async function () {
      const { mock, guard, now } = await fixture();
      await mock.setResponseModes(mode, 0);
      await expect(guard.execute(200n, 198n, now, now + 60, { value: 100n })).to.be.revertedWithCustomError(
        guard,
        "InvalidRouterResponse",
      );
      expect(await mock.lastValue()).to.equal(0n);
    });

    it(`atomically reverts malformed swap response mode ${mode}`, async function () {
      const { mock, guard, now } = await fixture();
      await mock.setResponseModes(0, mode);
      await expect(guard.execute(200n, 198n, now, now + 60, { value: 100n })).to.be.revertedWithCustomError(
        guard,
        "InvalidRouterResponse",
      );
      expect(await mock.lastValue()).to.equal(0n);
      expect(await ethers.provider.getBalance(await guard.getAddress())).to.equal(0n);
    });
  }
});
