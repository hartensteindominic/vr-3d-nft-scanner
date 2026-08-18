// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice HyperStream ETH marketplace foundation.
/// @dev TESTNET/REVIEW REQUIRED before any mainnet deployment.
contract HyperStreamMarketplace is ReentrancyGuard, Ownable {
    struct Listing {
        address seller;
        address nft;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    uint96 public feeBps = 250; // 2.5%
    uint256 public nextListingId = 1;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed listingId, address indexed seller, address indexed nft, uint256 tokenId, uint256 price);
    event Sold(uint256 indexed listingId, address indexed buyer, uint256 price, uint256 fee);
    event Cancelled(uint256 indexed listingId);
    event FeeUpdated(uint96 feeBps);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setFeeBps(uint96 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "fee too high");
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    function list(address nft, uint256 tokenId, uint256 price) external returns (uint256 listingId) {
        require(price > 0, "price is zero");
        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);
        listingId = nextListingId++;
        listings[listingId] = Listing(msg.sender, nft, tokenId, price, true);
        emit Listed(listingId, msg.sender, nft, tokenId, price);
    }

    function buy(uint256 listingId) external payable nonReentrant {
        Listing memory item = listings[listingId];
        require(item.active, "listing inactive");
        require(msg.value == item.price, "wrong ETH amount");
        listings[listingId].active = false;

        uint256 fee = (msg.value * feeBps) / 10000;
        uint256 sellerAmount = msg.value - fee;

        (bool paidSeller,) = payable(item.seller).call{value: sellerAmount}("");
        require(paidSeller, "seller payment failed");
        if (fee > 0) {
            (bool paidOwner,) = payable(owner()).call{value: fee}("");
            require(paidOwner, "fee payment failed");
        }

        IERC721(item.nft).safeTransferFrom(address(this), msg.sender, item.tokenId);
        emit Sold(listingId, msg.sender, msg.value, fee);
    }

    function cancel(uint256 listingId) external nonReentrant {
        Listing memory item = listings[listingId];
        require(item.active, "listing inactive");
        require(msg.sender == item.seller, "not seller");
        listings[listingId].active = false;
        IERC721(item.nft).safeTransferFrom(address(this), item.seller, item.tokenId);
        emit Cancelled(listingId);
    }

    function rescueERC721(address nft, uint256 tokenId, address to) external onlyOwner {
        IERC721(nft).safeTransferFrom(address(this), to, tokenId);
    }

    receive() external payable { revert("use buy"); }
}
