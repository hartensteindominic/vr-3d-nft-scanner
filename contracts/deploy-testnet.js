const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying ThreeNFT with:', deployer.address);

  const Factory = await hre.ethers.getContractFactory('ThreeNFT');
  const contract = await Factory.deploy('HyperStream 3D', 'H3D');
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('ThreeNFT deployed to:', address);
  console.log('Owner:', await contract.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
