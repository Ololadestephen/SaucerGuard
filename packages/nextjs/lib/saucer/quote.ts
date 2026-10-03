import { saucerFactoryAbi, saucerPairAbi, saucerRouterAbi } from "./abi";
import { ROUTER_ADDRESS, SWAP_PATH, WHBAR_ADDRESS } from "./config";
import type { SwapQuote } from "./guard";
import { type PublicClient, isAddressEqual, zeroAddress } from "viem";

export async function readLiveQuote(client: PublicClient, amountTinybars: bigint): Promise<SwapQuote> {
  if (amountTinybars <= 0n) throw new Error("Amount must be positive");
  const [block, routerWhbar, factory, amounts] = await Promise.all([
    client.getBlock(),
    client.readContract({ address: ROUTER_ADDRESS, abi: saucerRouterAbi, functionName: "whbar" }),
    client.readContract({ address: ROUTER_ADDRESS, abi: saucerRouterAbi, functionName: "factory" }),
    client.readContract({
      address: ROUTER_ADDRESS,
      abi: saucerRouterAbi,
      functionName: "getAmountsOut",
      args: [amountTinybars, [...SWAP_PATH]],
    }),
  ]);
  if (!isAddressEqual(routerWhbar, WHBAR_ADDRESS)) throw new Error("Router WHBAR does not match the template");
  if (amounts.length !== 2 || amounts[0] !== amountTinybars || amounts[1] <= 0n) {
    throw new Error("SaucerSwap returned an invalid quote");
  }

  const pair = await client.readContract({
    address: factory,
    abi: saucerFactoryAbi,
    functionName: "getPair",
    args: [...SWAP_PATH],
  });
  if (isAddressEqual(pair, zeroAddress)) throw new Error("The WHBAR/SAUCE pool is unavailable");
  const [token0, reserves] = await Promise.all([
    client.readContract({ address: pair, abi: saucerPairAbi, functionName: "token0" }),
    client.readContract({ address: pair, abi: saucerPairAbi, functionName: "getReserves" }),
  ]);
  const [reserve0, reserve1] = reserves;
  const [reserveIn, reserveOut] = isAddressEqual(token0, WHBAR_ADDRESS) ? [reserve0, reserve1] : [reserve1, reserve0];
  if (reserveIn <= 0n || reserveOut <= 0n) throw new Error("The pool has no usable reserves");
  const idealOut = (amountTinybars * reserveOut) / reserveIn;
  if (idealOut <= 0n) throw new Error("The pool quote is too small to assess");
  const impact = idealOut > amounts[1] ? ((idealOut - amounts[1]) * 10_000n) / idealOut : 0n;

  return {
    amountTinybars,
    outputRaw: amounts[1],
    quotedAt: Number(block.timestamp),
    priceImpactBps: Number(impact),
    pair: pair as `0x${string}`,
  };
}
