import type { Address } from "viem";

export const TESTNET_CHAIN_ID = 296;
export const ROUTER_ID = "0.0.19264";
export const WHBAR_ID = "0.0.15058";
export const SAUCE_ID = "0.0.1183558";
export const SAUCE_DECIMALS = 6;
export const MAX_INPUT_TINYBARS = 1_000_000_000n;
export const MAX_SLIPPAGE_BPS = 300;
export const MAX_PRICE_IMPACT_BPS = 300;
export const MAX_QUOTE_AGE_SECONDS = 30;
export const MAX_QUOTE_DRIFT_BPS = 100;
export const TX_DEADLINE_SECONDS = 120;

export function tokenIdToAddress(id: string): Address {
  const match = /^0\.0\.(\d+)$/.exec(id);
  if (!match) throw new Error("Expected a Hedera 0.0.x entity ID");
  return `0x${BigInt(match[1]).toString(16).padStart(40, "0")}` as Address;
}

export const ROUTER_ADDRESS = tokenIdToAddress(ROUTER_ID);
export const WHBAR_ADDRESS = tokenIdToAddress(WHBAR_ID);
export const SAUCE_ADDRESS = tokenIdToAddress(SAUCE_ID);
export const SWAP_PATH = [WHBAR_ADDRESS, SAUCE_ADDRESS] as const;
