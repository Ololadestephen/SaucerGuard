import { NextRequest } from "next/server";
import { SAUCE_ID } from "../../../lib/saucer/config";
import { GET } from "./route";
import assert from "node:assert/strict";
import test from "node:test";

const address = "0x0000000000000000000000000000000000000001";
const request = (account = address) => new NextRequest(`http://localhost/api/token-association?account=${account}`);

test("association API rejects invalid wallet input before making a network request", async context => {
  const fetch = context.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not fetch");
  });
  for (const account of ["", "bad", "0.0.123", `${address}/anything`])
    assert.equal((await GET(request(account))).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
});

test("association API filters the exact SAUCE token with a timeout and no cached response", async context => {
  context.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(
      url,
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${address}/tokens?token.id=${SAUCE_ID}&limit=1`,
    );
    assert.equal(init.cache, "no-store");
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json({ tokens: [{ token_id: SAUCE_ID }] });
  });
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { associated: true, tokenId: SAUCE_ID });
});

test("association API distinguishes an absent association from invalid evidence", async context => {
  const fetch = context.mock.method(globalThis, "fetch");
  for (const tokens of [[], [{ token_id: "0.0.999" }]]) {
    fetch.mock.mockImplementation(async () => Response.json({ tokens }));
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).associated, false);
  }
  for (const body of [null, {}, { tokens: null }, { tokens: [null] }, { tokens: [{ token_id: 1183558 }] }]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    const response = await GET(request());
    assert.equal(response.status, 502);
    assert.equal("associated" in (await response.json()), false);
  }
});

test("association API fails closed on HTTP failures, invalid JSON, and transport timeout", async context => {
  const fetch = context.mock.method(globalThis, "fetch");
  for (const status of [404, 429, 503]) {
    fetch.mock.mockImplementation(async () => new Response("unavailable", { status }));
    assert.equal((await GET(request())).status, 502);
  }
  fetch.mock.mockImplementation(async () => new Response("not JSON"));
  assert.equal((await GET(request())).status, 502);
  fetch.mock.mockImplementation(async () => {
    throw new Error("upstream secret-detail timeout");
  });
  const response = await GET(request());
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "Token association could not be verified" });
});
