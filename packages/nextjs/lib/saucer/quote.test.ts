import { ROUTER_ADDRESS, WHBAR_ADDRESS } from "./config";
import { readLiveQuote } from "./quote";
import assert from "node:assert/strict";
import test from "node:test";
import type { PublicClient } from "viem";

const pair = "0x000000000000000000000000000000000000beef";
const factory = "0x000000000000000000000000000000000000abcd";

function mockClient(routerWhbar = WHBAR_ADDRESS): PublicClient {
  return {
    getBlock: async () => ({ timestamp: 1_000n }),
    readContract: async ({ functionName, address }: { functionName: string; address: string }) => {
      if (functionName === "whbar" && address === ROUTER_ADDRESS) return routerWhbar;
      if (functionName === "factory") return factory;
      if (functionName === "getAmountsOut") return [100_000_000n, 54_000_000n];
      if (functionName === "getPair") return pair;
      if (functionName === "token0") return WHBAR_ADDRESS;
      if (functionName === "getReserves") return [1_000_000_000n, 600_000_000n, 0];
      throw new Error(`Unexpected read: ${functionName}`);
    },
  } as unknown as PublicClient;
}

test("quote derives impact from actual pool reserves and router output", async () => {
  const quote = await readLiveQuote(mockClient(), 100_000_000n);
  assert.equal(quote.outputRaw, 54_000_000n);
  assert.equal(quote.priceImpactBps, 1_000);
  assert.equal(quote.pair, pair);
  assert.equal(quote.quotedAt, 1_000);
});

test("quote refuses a router whose WHBAR identity is wrong", async () => {
  await assert.rejects(
    () => readLiveQuote(mockClient("0x0000000000000000000000000000000000000001"), 100_000_000n),
    /WHBAR does not match/,
  );
});
