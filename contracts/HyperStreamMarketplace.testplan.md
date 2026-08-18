# HyperStream Marketplace - Sepolia Test Plan

## Purpose
Validate the marketplace contract with test ETH before any production deployment.

## Required tests

1. Deploy with a dedicated Sepolia deployer wallet.
2. Confirm `owner()` is the intended deployer.
3. Confirm `feeBps()` starts at 250 (2.5%).
4. Mint a test ERC-721 to Seller A.
5. Seller A approves the marketplace for the NFT.
6. Seller A lists the NFT with a non-zero ETH price.
7. Confirm the NFT is escrowed by the marketplace and the listing is active.
8. Buyer B buys with the exact listing price.
9. Confirm the listing becomes inactive.
10. Confirm the NFT owner becomes Buyer B.
11. Confirm Seller A receives price minus the marketplace fee.
12. Confirm the marketplace owner receives the fee.
13. Attempt a purchase with the wrong ETH amount and confirm it reverts.
14. Attempt to buy an inactive listing and confirm it reverts.
15. Seller A lists another NFT and cancels it.
16. Confirm the NFT returns to Seller A.
17. Confirm another account cannot cancel Seller A's listing.
18. Confirm an account without NFT approval cannot create a listing.
19. Confirm a zero-price listing reverts.
20. Test ERC-721 safe-transfer compatibility with the marketplace contract.
21. Test repeated/reentrant purchase behavior with a malicious test receiver.
22. Verify fee updates are owner-only and capped at 10%.
23. Verify rescueERC721 is owner-only.
24. Verify direct ETH transfers revert.

## Production gate

Do not deploy to mainnet until all tests pass, the contract source is verified, and the marketplace logic has received an appropriate independent security review.