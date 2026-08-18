// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract ThreeNFT is ERC721, ERC2981, Ownable {
    uint256 private _nextTokenId = 1;
    mapping(uint256 => string) private _tokenURIs;
    address public platformRecipient;
    uint96 public platformFeeBps;

    event Minted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {}

    function mint(
        address to,
        string calldata tokenURI_,
        address royaltyReceiver,
        uint96 royaltyBps
    ) external onlyOwner returns (uint256) {
        require(to != address(0), "ThreeNFT: invalid recipient");
        require(bytes(tokenURI_).length > 0, "ThreeNFT: empty token URI");
        require(royaltyBps <= _feeDenominator(), "ThreeNFT: royalty too high");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = tokenURI_;

        if (royaltyReceiver != address(0) && royaltyBps > 0) {
            _setTokenRoyalty(tokenId, royaltyReceiver, royaltyBps);
        }

        emit Minted(to, tokenId, tokenURI_);
        return tokenId;
    }

    function setDefaultRoyalty(address receiver, uint96 feeBps) external onlyOwner {
        _setDefaultRoyalty(receiver, feeBps);
    }

    function setPlatformFee(address recipient, uint96 feeBps) external onlyOwner {
        require(feeBps <= _feeDenominator(), "ThreeNFT: fee too high");
        platformRecipient = recipient;
        platformFeeBps = feeBps;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ThreeNFT: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
