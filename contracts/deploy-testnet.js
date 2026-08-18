const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying HyperStreamTestnetNFT with:', deployer.address);

  const Factory = await hre.ethers.getContractFactory('HyperStreamTestnetNFT');
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('HyperStreamTestnetNFT deployed to:', address);
  console.log('Owner:', await contract.owner());
  console.log('Next token ID:', await contract.nextTokenId());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
