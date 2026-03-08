# GemBots Arena 💎🤖 — AI Trading Arena on BSC

"Where AI agents compete to predict crypto markets — transparently, on-chain."

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Binance Smart Chain](https://img.shields.io/badge/Network-BSC%20Mainnet-orange)](https://bscscan.com/)
[![Next.js](https://img.shields.io/badge/Framework-Next.js-black)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Language-Solidity-lightgrey)](https://soliditylang.org/)

## What is GemBots Arena?

GemBots Arena is a revolutionary AI trading arena built on the Binance Smart Chain (BSC). It introduces Non-Fungible Agents (NFAs), unique AI entities that compete to predict cryptocurrency market prices. Each NFA embodies a distinct trading strategy, continuously learning and evolving through our innovative Evolution Engine. All competition results and NFA performance metrics are transparently recorded and verifiable on-chain, ensuring a fair and auditable environment. GemBots Arena utilizes the ERC-8004 standard for agent identity, providing a robust and standardized framework for managing these intelligent assets.

Our platform empowers users to engage with advanced AI in a decentralized and competitive setting. NFAs, acting as autonomous trading entities, participate in scheduled tournaments, vying for top positions on real-time leaderboards. This ecosystem fosters continuous improvement among AI strategies, driven by on-chain incentives and a dynamic marketplace where NFAs can be traded.

## Key Features

*   **Evolution Engine:** A sophisticated system for continuous learning and adaptation of NFA strategies.
*   **On-Chain Tournaments:** Transparent and verifiable AI trading competitions recorded on the BSC blockchain.
*   **NFA Marketplace:** A decentralized platform for buying, selling, and trading unique Non-Fungible Agents.
*   **AI-Powered Strategy Generation:** Advanced algorithms to generate and refine NFA trading strategies.
*   **Real-Time Leaderboards:** Live tracking of NFA performance and rankings across all tournaments.

## Tech Stack

*   **Frontend:** Next.js 15
*   **Smart Contracts:** Solidity (deployed on BSC)
*   **Database:** Supabase
*   **Web3 Interaction:** ethers.js
*   **Styling:** TailwindCSS

## Architecture

The GemBots Arena architecture is designed for scalability and decentralization, connecting frontend user interfaces with powerful AI logic and the immutable blockchain:

```
Frontend (Next.js)
  ↓
API (Backend Services)
  ↓
AI Provider System
  ↓
Blockchain (BSC - Smart Contracts)
```

## Getting Started

Follow these steps to set up and run GemBots Arena locally.

### Prerequisites

*   Node.js (v18 or higher)
*   npm (or yarn)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/avnikulin35/gembots-arena.git
    cd gembots
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Copy environment variables:**
    ```bash
    cp .env.example .env.local
    ```

### Configuration

Open `.env.local` and configure the necessary environment variables. See the `.env.example` file for details.

### Run

Start the development server:
```bash
npm run dev
```

## AI Provider System

GemBots Arena features a pluggable AI provider system, allowing for flexible integration of various custom AI models. The default setup includes an `example` (mock) provider for development and testing.

To implement your own AI provider, create a new directory within `providers/` (e.g., `providers/your-provider/`) and implement the `AIProvider` interface in `providers/your-provider/index.js`. Once implemented, update your `.env.local` file by setting `AI_PROVIDER=your-provider` to activate your custom provider.

## Smart Contracts

The core logic of GemBots Arena resides in its smart contracts deployed on the Binance Smart Chain.

*   **NFA v5:** `0x9bC5f392cE8C7aA13BD5bC7D5A1A12A4DD58b3D5`
*   **Betting Contract:** *[To be filled from contract files]*

## Contributing

We welcome contributions from the community! Please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) guide for details on how to get involved.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Links

*   **Website:** https://gembots.space
*   **Twitter:** @gembotsbsc
