import { MAX_INPUT_TINYBARS } from "./config";
import { type SwapQuote, guardReason, minimumOutput, parseHbarInput, quoteDrifted, tinybarsToWeibars } from "./guard";
import assert from "node:assert/strict";
import test from "node:test";

const quote: SwapQuote = {
  blockNumber: 42n,
  amountTinybars: 100_000_000n,
  outputRaw: 54_000_000n,
  quotedAt: 1_000,
  priceImpactBps: 35,
  pair: "0x0000000000000000000000000000000000001234",
};

test("HBAR input is exact and capped at ten HBAR", () => {
  assert.equal(parseHbarInput("0.00000001"), 1n);
  assert.equal(parseHbarInput("10"), MAX_INPUT_TINYBARS);
  for (const amount of ["0", "10.00000001", "1.000000001", "-1", "1e3", "abc"]) {
    assert.throws(() => parseHbarInput(amount));
  }
});

test("wallet value conversion preserves the Hedera tinybar/weibar boundary exactly", () => {
  assert.equal(tinybarsToWeibars(parseHbarInput("0.00000001")), 10_000_000_000n);
  assert.equal(tinybarsToWeibars(parseHbarInput("0.1")), 100_000_000_000_000_000n);
  assert.equal(tinybarsToWeibars(parseHbarInput("10")), 10_000_000_000_000_000_000n);
  for (const amount of [0n, -1n, MAX_INPUT_TINYBARS + 1n]) assert.throws(() => tinybarsToWeibars(amount));
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
  assert.equal(guardReason({ ...base, nowSeconds: 1_030, quote: { ...quote, priceImpactBps: 300 } }), null);
  assert.match(guardReason({ ...base, nowSeconds: 999 }) ?? "", /expired/i);
  assert.match(guardReason({ ...base, connected: false }) ?? "", /connect/i);
  assert.match(guardReason({ ...base, associated: false }) ?? "", /associate/i);
});
