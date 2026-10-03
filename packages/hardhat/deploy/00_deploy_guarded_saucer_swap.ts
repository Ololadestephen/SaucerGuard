import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { getDeployGasPrice } from "../utils/getDeployGasPrice";

const longZero = (id: bigint): string => `0x${id.toString(16).padStart(40, "0")}`;

const deployGuardedSaucerSwap: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (hre.network.name !== "hederaTestnet") {
    throw new Error("GuardedSaucerSwap deployment is intentionally restricted to hederaTestnet");
  }

  const { deployer } = await hre.getNamedAccounts();
  await hre.deployments.deploy("GuardedSaucerSwap", {
    from: deployer,
    args: [longZero(19264n), longZero(15058n), longZero(1183558n)],
    log: true,
    autoMine: true,
    gasLimit: "3000000",
    gasPrice: await getDeployGasPrice(hre),
  });
};

deployGuardedSaucerSwap.tags = ["GuardedSaucerSwap"];
export default deployGuardedSaucerSwap;
