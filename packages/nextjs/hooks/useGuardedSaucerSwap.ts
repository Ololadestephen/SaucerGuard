import { useEffect, useMemo, useState } from "react";
import { useSauceAssociation } from "./useSauceAssociation";
import { type Address, isAddress, isAddressEqual } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { guardedSwapAbi, htsAssociationAbi } from "~~/lib/saucer/abi";
import {
  MAX_PRICE_IMPACT_BPS,
  MAX_QUOTE_AGE_SECONDS,
  ROUTER_ADDRESS,
  SAUCE_ADDRESS,
  TESTNET_CHAIN_ID,
  WHBAR_ADDRESS,
} from "~~/lib/saucer/config";
import {
  type SwapQuote,
  guardReason,
  minimumOutput,
  parseHbarInput,
  quoteDrifted,
  tinybarsToWeibars,
} from "~~/lib/saucer/guard";
import { readLiveQuote } from "~~/lib/saucer/quote";

const configuredGuard = process.env.NEXT_PUBLIC_GUARD_ADDRESS;
const guardAddress = configuredGuard && isAddress(configuredGuard) ? (configuredGuard as Address) : null;

export function useGuardedSaucerSwap() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: TESTNET_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("1");
  const [slippageBps, setSlippageBps] = useState(100);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const { associated, associationError, refreshAssociation } = useSauceAssociation(address);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [associationHash, setAssociationHash] = useState<`0x${string}` | null>(null);
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1_000);
    return () => clearInterval(timer);
  }, []);

  const { amountTinybars, amountError } = useMemo(() => {
    try {
      return { amountTinybars: parseHbarInput(amount), amountError: "" };
    } catch (caught) {
      return { amountTinybars: null, amountError: caught instanceof Error ? caught.message : "Invalid amount" };
    }
  }, [amount]);
  const minimumRaw = quote ? minimumOutput(quote.outputRaw, slippageBps) : null;
  const blockReason = guardReason({
    quote,
    inputTinybars: amountTinybars,
    connected: isConnected,
    chainId,
    associated,
    guardConfigured: Boolean(guardAddress),
    nowSeconds,
  });
  const quoteAge = quote ? Math.max(0, nowSeconds - quote.quotedAt) : null;

  function updateAmount(value: string) {
    setAmount(value);
    setQuote(null);
  }

  async function getQuote() {
    setError("");
    setTxHash(null);
    setQuote(null);
    if (!publicClient || amountTinybars === null) {
      setError(amountError || "Testnet RPC is unavailable");
      return;
    }
    setLoading(true);
    try {
      setQuote(await readLiveQuote(publicClient, amountTinybars));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live quote failed");
    } finally {
      setLoading(false);
    }
  }

  async function executeSwap() {
    setError("");
    if (!publicClient || !address || !guardAddress || !quote || minimumRaw === null || blockReason) {
      setError(blockReason || "Swap prerequisites are missing");
      return;
    }
    setLoading(true);
    try {
      const [router, wrappedHbar, outputToken] = await Promise.all([
        publicClient.readContract({ address: guardAddress, abi: guardedSwapAbi, functionName: "router" }),
        publicClient.readContract({ address: guardAddress, abi: guardedSwapAbi, functionName: "wrappedHbar" }),
        publicClient.readContract({ address: guardAddress, abi: guardedSwapAbi, functionName: "outputToken" }),
      ]);
      if (
        !isAddressEqual(router, ROUTER_ADDRESS) ||
        !isAddressEqual(wrappedHbar, WHBAR_ADDRESS) ||
        !isAddressEqual(outputToken, SAUCE_ADDRESS)
      ) {
        throw new Error("Configured guard is not wired to the expected testnet contracts");
      }
      const fresh = await readLiveQuote(publicClient, quote.amountTinybars);
      if (fresh.quotedAt - quote.quotedAt > MAX_QUOTE_AGE_SECONDS || quoteDrifted(quote.outputRaw, fresh.outputRaw)) {
        throw new Error("The quote moved or expired. Refresh and review it again.");
      }
      if (fresh.priceImpactBps > MAX_PRICE_IMPACT_BPS) throw new Error("Price impact exceeds the 3% policy");
      const hash = await writeContractAsync({
        chainId: TESTNET_CHAIN_ID,
        address: guardAddress,
        abi: guardedSwapAbi,
        functionName: "execute",
        args: [quote.outputRaw, minimumRaw, BigInt(quote.quotedAt), BigInt(quote.quotedAt + 120)],
        value: tinybarsToWeibars(quote.amountTinybars),
        gas: 1_500_000n,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error("The on-chain swap reverted. No swap was completed.");
      setTxHash(hash);
      setQuote(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  async function associateSauce() {
    setError("");
    if (!publicClient || !address || chainId !== TESTNET_CHAIN_ID || associated !== false) {
      setError("Connect on Hedera testnet and verify the missing SAUCE association first.");
      return;
    }
    setLoading(true);
    setAssociationHash(null);
    try {
      const { result, request } = await publicClient.simulateContract({
        account: address,
        address: SAUCE_ADDRESS,
        abi: htsAssociationAbi,
        functionName: "associate",
      });
      if (result !== 22n) throw new Error(`HTS association refused with response code ${result}`);
      const hash = await writeContractAsync({ ...request, chainId: TESTNET_CHAIN_ID });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error("The token association transaction reverted.");
      setAssociationHash(hash);
      refreshAssociation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Token association failed");
    } finally {
      setLoading(false);
    }
  }

  return {
    amount,
    amountTinybars,
    amountError,
    updateAmount,
    slippageBps,
    setSlippageBps,
    quote,
    quoteAge,
    minimumRaw,
    associated,
    associationError,
    refreshAssociation,
    loading,
    error,
    txHash,
    chainId,
    address,
    guardAddress,
    blockReason,
    getQuote,
    executeSwap,
    associateSauce,
    associationHash,
  };
}
