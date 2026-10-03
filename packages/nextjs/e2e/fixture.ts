import { guardedSwapAbi, htsAssociationAbi, saucerFactoryAbi, saucerPairAbi, saucerRouterAbi } from "../lib/saucer/abi";
import { ROUTER_ADDRESS, SAUCE_ADDRESS, WHBAR_ADDRESS } from "../lib/saucer/config";
import { type Page, expect } from "@playwright/test";
import { type Hex, decodeFunctionData, encodeFunctionResult, toHex } from "viem";

// Browser-only fixtures: no key, real signature, live quote, or network transaction.
export const FIXTURE_ACCOUNT = "0x0000000000000000000000000000000000000042";
export const GUARD_ADDRESS = "0xC18620A757AF927BC758Fe279b8C8Ba2340c260A";
const PAIR = "0x000000000000000000000000000000000000beef";
const FACTORY = "0x000000000000000000000000000000000000abcd";
export const FIXTURE_HASH = `0x${"a".repeat(64)}` as Hex;
const BLOCK_HASH = `0x${"b".repeat(64)}` as Hex;

type RpcRequest = { id: number; method: string; params?: unknown[] };
type FixtureOptions = {
  associated?: boolean | null;
  chainId?: number;
  wrongGuard?: boolean;
  rejectSignature?: boolean;
  reverted?: boolean;
  associationCode?: bigint;
  mirrorLag?: boolean;
};

export async function installFixture(page: Page, options: FixtureOptions = {}) {
  const state = {
    associated: options.associated === undefined ? true : options.associated,
    deteriorate: false,
    rpcUnavailable: false,
    quoteCalls: 0,
    pinnedQuoteReads: [] as string[],
  };
  const timestamp = Math.floor(Date.now() / 1000);
  const block = {
    hash: BLOCK_HASH,
    parentHash: BLOCK_HASH,
    number: "0x2a",
    timestamp: toHex(timestamp),
    nonce: "0x0000000000000000",
    sha3Uncles: BLOCK_HASH,
    logsBloom: `0x${"0".repeat(512)}`,
    transactionsRoot: BLOCK_HASH,
    stateRoot: BLOCK_HASH,
    receiptsRoot: BLOCK_HASH,
    miner: FIXTURE_ACCOUNT,
    difficulty: "0x0",
    totalDifficulty: "0x0",
    extraData: "0x",
    size: "0x1",
    gasLimit: "0x1c9c380",
    gasUsed: "0x1",
    baseFeePerGas: "0x3b9aca00",
    transactions: [],
    uncles: [],
  };

  function contractCall(params: unknown[] = []) {
    const call = params[0] as { to: string; data: Hex };
    const address = call.to.toLowerCase();
    if (address === GUARD_ADDRESS.toLowerCase()) {
      const { functionName } = decodeFunctionData({ abi: guardedSwapAbi, data: call.data });
      const result =
        functionName === "router"
          ? options.wrongGuard
            ? PAIR
            : ROUTER_ADDRESS
          : functionName === "wrappedHbar"
            ? WHBAR_ADDRESS
            : SAUCE_ADDRESS;
      return encodeFunctionResult({ abi: guardedSwapAbi, functionName: functionName as "router", result });
    }
    if (address === SAUCE_ADDRESS.toLowerCase()) {
      return encodeFunctionResult({
        abi: htsAssociationAbi,
        functionName: "associate",
        result: options.associationCode ?? 22n,
      });
    }
    state.pinnedQuoteReads.push(String(params[1]));
    if (address === ROUTER_ADDRESS.toLowerCase()) {
      const { functionName, args } = decodeFunctionData({ abi: saucerRouterAbi, data: call.data });
      if (functionName === "whbar")
        return encodeFunctionResult({ abi: saucerRouterAbi, functionName, result: WHBAR_ADDRESS });
      if (functionName === "factory")
        return encodeFunctionResult({ abi: saucerRouterAbi, functionName, result: FACTORY });
      const input = args[0];
      state.quoteCalls += 1;
      const output = (input * (state.deteriorate ? 500n : 549n)) / 1_000n;
      return encodeFunctionResult({ abi: saucerRouterAbi, functionName, result: [input, output] });
    }
    if (address === FACTORY.toLowerCase())
      return encodeFunctionResult({ abi: saucerFactoryAbi, functionName: "getPair", result: PAIR });
    if (address === PAIR.toLowerCase()) {
      const { functionName } = decodeFunctionData({ abi: saucerPairAbi, data: call.data });
      if (functionName === "token0")
        return encodeFunctionResult({ abi: saucerPairAbi, functionName, result: WHBAR_ADDRESS });
      if (functionName === "token1")
        return encodeFunctionResult({ abi: saucerPairAbi, functionName, result: SAUCE_ADDRESS });
      return encodeFunctionResult({
        abi: saucerPairAbi,
        functionName,
        result: [1_000_000_000_000n, 550_000_000_000n, timestamp],
      });
    }
    throw new Error(`Unexpected fixture contract ${address}`);
  }

  function rpc(request: RpcRequest) {
    let result: unknown;
    switch (request.method) {
      case "eth_chainId":
        result = "0x128";
        break;
      case "eth_blockNumber":
        result = "0x2a";
        break;
      case "eth_getBlockByNumber":
        result = block;
        break;
      case "eth_getBalance":
        result = toHex(10n ** 20n);
        break;
      case "eth_getCode":
        result = "0x6000";
        break;
      case "eth_estimateGas":
        result = "0x493e0";
        break;
      case "eth_gasPrice":
        result = "0x3b9aca00";
        break;
      case "eth_maxPriorityFeePerGas":
        result = "0x1";
        break;
      case "eth_getTransactionCount":
        result = "0x0";
        break;
      case "eth_call":
        result = contractCall(request.params);
        break;
      case "eth_getTransactionReceipt":
        result = {
          transactionHash: FIXTURE_HASH,
          transactionIndex: "0x0",
          blockHash: BLOCK_HASH,
          blockNumber: "0x2a",
          from: FIXTURE_ACCOUNT,
          to: GUARD_ADDRESS,
          cumulativeGasUsed: "0x493e0",
          gasUsed: "0x493e0",
          contractAddress: null,
          logs: [],
          logsBloom: `0x${"0".repeat(512)}`,
          status: options.reverted ? "0x0" : "0x1",
          effectiveGasPrice: "0x3b9aca00",
          type: "0x0",
        };
        break;
      default:
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32601, message: `Unhandled fixture method ${request.method}` },
        };
    }
    return { jsonrpc: "2.0", id: request.id, result };
  }

  await page.route("**/api/token-association?**", async route => {
    if (state.associated === null) return route.fulfill({ status: 502, json: { error: "Fixture mirror unavailable" } });
    return route.fulfill({ json: { associated: state.associated, tokenId: "0.0.1183558" } });
  });
  await page.route("https://testnet.hashio.io/**", async route => {
    if (state.rpcUnavailable) return route.fulfill({ status: 503, body: "Fixture RPC unavailable" });
    const body: RpcRequest | RpcRequest[] = route.request().postDataJSON();
    return route.fulfill({ json: Array.isArray(body) ? body.map(rpc) : rpc(body) });
  });
  await page.route("https://mainnet.hashio.io/**", route => route.abort());
  await page.exposeFunction("fixtureTransactionSubmitted", (transaction: { to: string }) => {
    if (transaction.to.toLowerCase() === SAUCE_ADDRESS.toLowerCase() && !options.reverted && !options.mirrorLag)
      state.associated = true;
  });
  await page.addInitScript(
    ({ account, hash, chainId, rejectSignature }) => {
      type WalletWindow = Window & {
        ethereum: unknown;
        fixtureTransactions: Record<string, string>[];
        fixtureTransactionSubmitted: (transaction: Record<string, string>) => Promise<void>;
      };
      const walletWindow = window as unknown as WalletWindow;
      walletWindow.fixtureTransactions = [];
      const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
      let id = 0;
      let authorized = false;
      const provider = {
        isMetaMask: true,
        isConnected: () => true,
        _metamask: { isUnlocked: async () => true },
        on: (event: string, listener: (...args: unknown[]) => void) => {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)?.add(listener);
        },
        removeListener: (event: string, listener: (...args: unknown[]) => void) =>
          listeners.get(event)?.delete(listener),
        request: async ({ method, params = [] }: { method: string; params?: unknown[] }) => {
          if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
          if (method === "eth_accounts") return authorized ? [account] : [];
          if (method === "eth_requestAccounts") {
            authorized = true;
            return [account];
          }
          if (method === "wallet_requestPermissions") {
            authorized = true;
            return [{ parentCapability: "eth_accounts" }];
          }
          if (method === "wallet_getPermissions") return authorized ? [{ parentCapability: "eth_accounts" }] : [];
          if (method === "eth_sendTransaction") {
            if (rejectSignature) throw Object.assign(new Error("Fixture user rejected the request"), { code: 4001 });
            const transaction = params[0] as Record<string, string>;
            walletWindow.fixtureTransactions.push(transaction);
            await walletWindow.fixtureTransactionSubmitted(transaction);
            return hash;
          }
          const response = await fetch("https://testnet.hashio.io/api", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
          });
          const body = await response.json();
          if (body.error) throw Object.assign(new Error(body.error.message), { code: body.error.code });
          return body.result;
        },
      };
      walletWindow.ethereum = provider;
      const announce = () =>
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: {
              info: {
                uuid: "350670db-19fa-4704-a166-e52e178b59d2",
                name: "MetaMask",
                icon: "data:image/svg+xml;base64,PHN2Zy8+",
                rdns: "io.metamask",
              },
              provider,
            },
          }),
        );
      window.addEventListener("eip6963:requestProvider", announce);
      announce();
    },
    {
      account: FIXTURE_ACCOUNT,
      hash: FIXTURE_HASH,
      chainId: options.chainId ?? 296,
      rejectSignature: options.rejectSignature ?? false,
    },
  );
  return state;
}

export async function connectFixtureWallet(page: Page) {
  await page.getByRole("button", { name: "Connect Wallet", exact: true }).click();
  await page.getByRole("button", { name: "MetaMask", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function submittedTransactions(page: Page) {
  return page.evaluate(
    () => (window as unknown as { fixtureTransactions: Record<string, string>[] }).fixtureTransactions,
  );
}
