import { readSauceAssociation } from "./association";
import assert from "node:assert/strict";
import test from "node:test";

const address = "0x0000000000000000000000000000000000000001";

test("association reader accepts only a valid mirror-backed boolean", async () => {
  const result = await readSauceAssociation(address, async (url, init) => {
    assert.equal(url, `/api/token-association?account=${address}`);
    assert.equal(init.cache, "no-store");
    return { ok: true, json: async () => ({ associated: true }) };
  });
  assert.equal(result, true);
});

test("association reader refuses malformed, failed, and unavailable responses", async () => {
  for (const response of [
    { ok: true, json: async () => ({ associated: "yes" }) },
    { ok: true, json: async () => null },
    { ok: false, json: async () => ({ associated: true }) },
  ]) {
    await assert.rejects(
      readSauceAssociation(address, async () => response),
      /Association response unavailable/,
    );
  }
  await assert.rejects(
    readSauceAssociation(address, async () => Promise.reject(new Error("timeout"))),
    /timeout/,
  );
});
