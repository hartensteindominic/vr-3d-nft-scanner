// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title VRHologramNFT
 * @dev ERC-721 for real-world scanned 3D holograms / digital twins
 *      Each token points to IPFS metadata (tokenURI) that includes the GLB model.
 */
contract VRHologramNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Optional royalty info (EIP-2981 style simple version)
    address public royaltyReceiver;
    uint96 public royaltyBps; // basis points (500 = 5%)

    event HologramMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor(address initialOwner) ERC721("VR Hologram NFT", "VRHN") Ownable(initialOwner) {
        royaltyReceiver = initialOwner;
        royaltyBps = 500; // 5% default
    }

    function mintHologram(address to, string memory uri) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit HologramMinted(to, tokenId, uri);
        return tokenId;
    }

    // Owner can mint too (for batch / admin)
    function ownerMint(address to, string memory uri) external onlyOwner returns (uint256) {
        return mintHologram(to, uri);
    }

    function setRoyalty(address receiver, uint96 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        royaltyReceiver = receiver;
        royaltyBps = bps;
    }

    // Simple royalty view (compatible with many marketplaces)
    function royaltyInfo(uint256, uint256 salePrice) external view returns (address, uint256) {
        return (royaltyReceiver, (salePrice * royaltyBps) / 10000);
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // Overrides required by Solidity
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
