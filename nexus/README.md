# NEXUS NFT — Futuristic 3D Marketplace

A next-generation 3D NFT marketplace experience, built as a static site (GitHub Pages ready).

## Features

- 🌌 Three.js ambient 3D background (particle nebula, floating wireframes, mouse + scroll parallax)
- 🛒 Marketplace with search, category filters, sorting, rarity badges and 3D tilt cards
- 🏆 Top Collections leaderboard with floor price, volume and sparklines
- 🔨 Live auctions with real-time countdowns and bid modal
- ✨ Mint Studio with two modes:
  - **Real Mint (Sepolia)** — sends an actual transaction to the HyperStream contract `0x6ebd920e2383e11a06440ed632c51225b5f1909b` via any EIP-1193 wallet (MetaMask etc.), with chain detection, automatic Sepolia switching, live gas estimation and Etherscan receipt links
  - **Demo Mode** — simulated wallet + mints so anyone can explore risk-free
- 📈 Staking dashboard with reward calculator
- 🗳️ DAO governance with proposal voting
- 📊 Live activity feed, trader leaderboard, watchlist (♥)
- 👤 Portfolio dashboard — owned NFTs + full transaction history persisted in localStorage
- ⌘K command palette for power users
- 🐙 GitHub profile integration
- 💹 Live ETH/USD ticker (CoinGecko) with graceful fallback

## Run

Static site — open `nexus/index.html` or serve the folder. On GitHub Pages it is available at `/nexus/`.

> Testnet only. Never send mainnet funds to the Sepolia contract.
