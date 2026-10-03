import { readLiveQuote } from "../lib/saucer/quote";
import { createPublicClient, http } from "viem";
import { hederaTestnet } from "viem/chains";

async function main() {
  const client = createPublicClient({
    chain: hederaTestnet,
    transport: http(process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL || "https://testnet.hashio.io/api"),
  });
  const quote = await readLiveQuote(client, 100_000_000n);
  process.stdout.write(
    JSON.stringify(
      {
        network: "hederaTestnet",
        source: "SaucerSwap V1 router + factory + pair",
        amountTinybars: quote.amountTinybars.toString(),
        outputRaw: quote.outputRaw.toString(),
        quotedAt: quote.quotedAt,
        pair: quote.pair,
        priceImpactBps: quote.priceImpactBps,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch(error => {
  process.stderr.write(`Live testnet read failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
