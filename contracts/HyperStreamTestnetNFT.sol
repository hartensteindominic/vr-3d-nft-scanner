// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title HyperStream Testnet NFT
/// @notice Simple ERC-721 minting contract for HyperStream marketplace testing.
contract HyperStreamTestnetNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor(address initialOwner)
        ERC721("HyperStream 3D", "HSTR3D")
        Ownable(initialOwner)
    {}

    function mint(address to, string calldata metadataURI)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
