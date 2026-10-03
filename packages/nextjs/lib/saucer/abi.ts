import { parseAbi } from "viem";

export const saucerRouterAbi = parseAbi([
  "function factory() view returns (address)",
  "function whbar() view returns (address)",
  "function getAmountsOut(uint256 amountIn,address[] path) view returns (uint256[] amounts)",
]);

export const saucerFactoryAbi = parseAbi(["function getPair(address tokenA,address tokenB) view returns (address)"]);

export const saucerPairAbi = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0,uint112 reserve1,uint32 blockTimestampLast)",
]);

export const htsAssociationAbi = parseAbi(["function associate() returns (int64 responseCode)"]);

export const guardedSwapAbi = parseAbi([
  "function router() view returns (address)",
  "function wrappedHbar() view returns (address)",
  "function outputToken() view returns (address)",
  "function execute(uint256 quotedOutput,uint256 minimumOutput,uint256 quotedAt,uint256 deadline) payable returns (uint256 actualOutput)",
  "event GuardedSwapExecuted(address indexed trader,uint256 inputTinybars,uint256 quotedOutput,uint256 freshOutput,uint256 minimumOutput,uint256 actualOutput)",
]);
