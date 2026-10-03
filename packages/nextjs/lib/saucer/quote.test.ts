import { ROUTER_ADDRESS, SAUCE_ADDRESS, WHBAR_ADDRESS } from "./config";
import { readLiveQuote } from "./quote";
import assert from "node:assert/strict";
import test from "node:test";
import { type PublicClient, zeroAddress } from "viem";

const pair = "0x000000000000000000000000000000000000beef";
const factory = "0x000000000000000000000000000000000000abcd";

const blockNumber = 42n;

function mockClient(overrides: Record<string, unknown> = {}): PublicClient {
  const responses: Record<string, unknown> = {
    whbar: WHBAR_ADDRESS,
    factory,
    getAmountsOut: [100_000_000n, 54_000_000n],
    getPair: pair,
    token0: WHBAR_ADDRESS,
    token1: SAUCE_ADDRESS,
    getReserves: [1_000_000_000n, 600_000_000n, 0],
    ...overrides,
  };
  return {
    getBlock: async () => ({ number: blockNumber, timestamp: 1_000n }),
    readContract: async (request: { functionName: string; address: string; blockNumber: bigint }) => {
      assert.equal(request.blockNumber, blockNumber, "every quote read must use the same block");
      if (request.functionName === "whbar") assert.equal(request.address, ROUTER_ADDRESS);
      const result = responses[request.functionName];
      if (result instanceof Error) throw result;
      if (result === undefined) throw new Error(`Unexpected read: ${request.functionName}`);
      return result;
    },
  } as unknown as PublicClient;
}

test("quote derives impact from one pinned block of actual pool reserves and router output", async () => {
  const quote = await readLiveQuote(mockClient(), 100_000_000n);
  assert.equal(quote.outputRaw, 54_000_000n);
  assert.equal(quote.priceImpactBps, 1_000);
  assert.equal(quote.pair, pair);
  assert.equal(quote.quotedAt, 1_000);
  assert.equal(quote.blockNumber, blockNumber);
});

test("quote handles either valid token ordering", async () => {
  const forward = await readLiveQuote(mockClient(), 100_000_000n);
  const reverse = await readLiveQuote(
    mockClient({
      token0: SAUCE_ADDRESS,
      token1: WHBAR_ADDRESS,
      getReserves: [600_000_000n, 1_000_000_000n, 0],
    }),
    100_000_000n,
  );
  assert.deepEqual(reverse, forward);
});

test("quote rounds impact upward so a fractional breach cannot pass the three-percent cap", async () => {
  const quote = await readLiveQuote(mockClient({ getAmountsOut: [100_000_000n, 58_199_999n] }), 100_000_000n);
  assert.equal(quote.priceImpactBps, 301);
});

test("quote refuses unavailable or mismatched routing identities", async () => {
  for (const [overrides, message] of [
    [{ whbar: pair }, /WHBAR does not match/],
    [{ factory: zeroAddress }, /factory is unavailable/],
    [{ getPair: zeroAddress }, /pool is unavailable/],
    [{ token0: pair }, /Pool tokens do not match/],
    [{ token1: WHBAR_ADDRESS }, /Pool tokens do not match/],
  ] as const) {
    await assert.rejects(() => readLiveQuote(mockClient(overrides), 100_000_000n), message);
  }
});

test("quote refuses malformed router outputs and empty reserves", async () => {
  for (const getAmountsOut of [[100_000_000n], [1n, 54_000_000n], [100_000_000n, 0n]]) {
    await assert.rejects(() => readLiveQuote(mockClient({ getAmountsOut }), 100_000_000n), /invalid quote/);
  }
  for (const getReserves of [
    [0n, 600_000_000n, 0],
    [1_000_000_000n, 0n, 0],
  ]) {
    await assert.rejects(() => readLiveQuote(mockClient({ getReserves }), 100_000_000n), /no usable reserves/);
  }
  await assert.rejects(
    () => readLiveQuote(mockClient({ getReserves: [10n ** 30n, 1n, 0] }), 100_000_000n),
    /too small/,
  );
});

test("quote preserves RPC failures and rejects unconfirmed blocks and nonpositive input", async () => {
  await assert.rejects(
    () => readLiveQuote(mockClient({ getPair: new Error("RPC unavailable") }), 100_000_000n),
    /RPC unavailable/,
  );
  const client = mockClient();
  client.getBlock = async () => ({ number: null, timestamp: 1_000n }) as never;
  await assert.rejects(() => readLiveQuote(client, 100_000_000n), /confirmed block/);
  for (const amount of [0n, -1n]) await assert.rejects(() => readLiveQuote(mockClient(), amount), /positive/);
});
