// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title ThreeNFT
 * @dev Simple ERC-721 contract with ERC-2981 royalties and owner-only minting helper.
 *      Stores tokenURI per token so metadata can point to IPFS/Arweave-hosted assets.
 */
contract ThreeNFT is ERC721, ERC2981, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // tokenId => tokenURI
    mapping(uint256 => string) private _tokenURIs;

    // Platform fee recipient and basis points (optional)
    address public platformRecipient;
    uint96 public platformFeeBps;

    event Minted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    /**
     * @dev Mint a new token to `to` with metadata `tokenURI`.
     * Only the contract owner can call this helper (change to role-based if needed).
     */
    function mint(address to, string calldata tokenURI_, address royaltyReceiver, uint96 royaltyBps) external onlyOwner returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        if (royaltyReceiver != address(0) && royaltyBps > 0) {
            _setTokenRoyalty(tokenId, royaltyReceiver, royaltyBps);
        }

        emit Minted(to, tokenId, tokenURI_);
        return tokenId;
    }

    /**
     * @dev Set default royalty for all tokens.
     */
    function setDefaultRoyalty(address receiver, uint96 feeBps) external onlyOwner {
        _setDefaultRoyalty(receiver, feeBps);
    }

    /**
     * @dev Set token URI for a token id.
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ThreeNFT: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ThreeNFT: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    // Platform fee helpers (optional)
    function setPlatformFee(address recipient, uint96 feeBps) external onlyOwner {
        platformRecipient = recipient;
        platformFeeBps = feeBps;
    }

    // The following functions are overrides required by Solidity.
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
