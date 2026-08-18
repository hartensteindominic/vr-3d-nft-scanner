const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("HyperStreamTestnetNFT");
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("HyperStreamTestnetNFT:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
