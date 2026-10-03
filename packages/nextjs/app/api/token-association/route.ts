import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { SAUCE_ID } from "~~/lib/saucer/config";

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get("account");
  if (!account || !isAddress(account)) {
    return NextResponse.json({ error: "A valid EVM wallet address is required" }, { status: 400 });
  }

  const endpoint = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${account}/tokens?token.id=${SAUCE_ID}&limit=1`;
  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Mirror node returned ${response.status}`);
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("tokens" in body) || !Array.isArray(body.tokens)) {
      throw new Error("Unexpected mirror-node response");
    }
    if (
      body.tokens.some(
        (token: unknown) =>
          typeof token !== "object" || token === null || !("token_id" in token) || typeof token.token_id !== "string",
      )
    ) {
      throw new Error("Unexpected token association record");
    }
    const associated = body.tokens.some((token: { token_id: string }) => token.token_id === SAUCE_ID);
    return NextResponse.json({ associated, tokenId: SAUCE_ID });
  } catch {
    return NextResponse.json({ error: "Token association could not be verified" }, { status: 502 });
  }
}
