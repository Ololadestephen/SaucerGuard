import { MAX_INPUT_TINYBARS } from "./config";
import { type SwapQuote, guardReason, minimumOutput, parseHbarInput, quoteDrifted } from "./guard";
import assert from "node:assert/strict";
import test from "node:test";

const quote: SwapQuote = {
  amountTinybars: 100_000_000n,
  outputRaw: 54_000_000n,
  quotedAt: 1_000,
  priceImpactBps: 35,
  pair: "0x1234",
};

test("HBAR input is exact and capped at ten HBAR", () => {
  assert.equal(parseHbarInput("0.00000001"), 1n);
  assert.equal(parseHbarInput("10"), MAX_INPUT_TINYBARS);
  for (const amount of ["0", "10.00000001", "1.000000001", "-1", "1e3", "abc"]) {
    assert.throws(() => parseHbarInput(amount));
  }
});

test("minimum output uses integer basis points", () => {
  assert.equal(minimumOutput(54_000_000n, 100), 53_460_000n);
  assert.throws(() => minimumOutput(1n, 301));
  assert.throws(() => minimumOutput(0n, 100));
});

test("quote drift blocks a fall beyond one percent", () => {
  assert.equal(quoteDrifted(10_000n, 9_900n), false);
  assert.equal(quoteDrifted(10_000n, 9_899n), true);
});

test("execution fails closed on stale quote, wrong chain, missing association, and price impact", () => {
  const base = {
    quote,
    inputTinybars: quote.amountTinybars,
    connected: true,
    chainId: 296,
    associated: true,
    guardConfigured: true,
    nowSeconds: 1_010,
  };
  assert.equal(guardReason(base), null);
  assert.match(guardReason({ ...base, nowSeconds: 1_031 }) ?? "", /expired/i);
  assert.match(guardReason({ ...base, chainId: 295 }) ?? "", /testnet/i);
  assert.match(guardReason({ ...base, associated: null }) ?? "", /associate/i);
  assert.match(guardReason({ ...base, guardConfigured: false }) ?? "", /deploy/i);
  assert.match(guardReason({ ...base, quote: { ...quote, priceImpactBps: 301 } }) ?? "", /impact/i);
  assert.match(guardReason({ ...base, inputTinybars: 200n }) ?? "", /fresh quote/i);
});
