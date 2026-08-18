// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title HyperStream 3D NFT
/// @notice Minimal ERC-721 collection intended for testnet use.
contract HyperStreamTestnetNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor(address initialOwner)
        ERC721("HyperStream 3D", "HSTR3D")
        Ownable(initialOwner)
    {}

    /// @notice Mint directly to the connected creator's wallet.
    function mint(string calldata metadataURI) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);
    }

    /// @notice Owner-only mint for creator/admin workflows.
    function mintTo(address to, string calldata metadataURI)
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
