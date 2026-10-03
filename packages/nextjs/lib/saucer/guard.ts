import {
  MAX_INPUT_TINYBARS,
  MAX_PRICE_IMPACT_BPS,
  MAX_QUOTE_AGE_SECONDS,
  MAX_QUOTE_DRIFT_BPS,
  MAX_SLIPPAGE_BPS,
  TESTNET_CHAIN_ID,
} from "./config";
import { parseUnits } from "viem";

export type SwapQuote = {
  amountTinybars: bigint;
  outputRaw: bigint;
  quotedAt: number;
  priceImpactBps: number;
  pair: `0x${string}`;
};

export function parseHbarInput(raw: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(raw)) {
    throw new Error("Enter a positive HBAR amount with at most 8 decimals");
  }
  const amount = parseUnits(raw, 8);
  if (amount <= 0n || amount > MAX_INPUT_TINYBARS) {
    throw new Error("Amount must be greater than zero and no more than 10 HBAR");
  }
  return amount;
}

export function minimumOutput(outputRaw: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > MAX_SLIPPAGE_BPS) {
    throw new Error("Slippage must be between 0 and 300 bps");
  }
  if (outputRaw <= 0n) throw new Error("Quote output must be positive");
  return (outputRaw * BigInt(10_000 - slippageBps)) / 10_000n;
}

export function quoteDrifted(original: bigint, fresh: bigint): boolean {
  return fresh < (original * BigInt(10_000 - MAX_QUOTE_DRIFT_BPS)) / 10_000n;
}

export function guardReason(args: {
  quote: SwapQuote | null;
  inputTinybars: bigint | null;
  connected: boolean;
  chainId: number | undefined;
  associated: boolean | null;
  guardConfigured: boolean;
  nowSeconds: number;
}): string | null {
  const { quote, inputTinybars, connected, chainId, associated, guardConfigured, nowSeconds } = args;
  if (!quote || !inputTinybars || quote.amountTinybars !== inputTinybars)
    return "Request a fresh quote for this amount";
  if (nowSeconds < quote.quotedAt || nowSeconds - quote.quotedAt > MAX_QUOTE_AGE_SECONDS) {
    return "Quote expired. Refresh it before signing";
  }
  if (quote.priceImpactBps > MAX_PRICE_IMPACT_BPS) return "Price impact exceeds the 3% policy";
  if (!connected) return "Connect a testnet wallet";
  if (chainId !== TESTNET_CHAIN_ID) return "Switch your wallet to Hedera testnet";
  if (associated !== true) return "Associate testnet SAUCE with your wallet first";
  if (!guardConfigured) return "Deploy the guard and set NEXT_PUBLIC_GUARD_ADDRESS";
  return null;
}
