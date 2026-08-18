require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: '0.8.19',
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.RPC_URL || '',
      accounts: process.env.MINTER_PRIVATE_KEY ? [process.env.MINTER_PRIVATE_KEY] : []
    }
  }
};
