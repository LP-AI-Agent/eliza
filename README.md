# Toby: Professional-Grade DeFi Liquidity Management on SUI

Toby is an AI-powered liquidity management agent that brings professional-grade TradFi portfolio tools to DeFi liquidity providers on SUI blockchain, enabling data-driven position management and optimization.

## 🚀 Quick Start

### Prerequisites
* Node.js 23+
* pnpm

### Installation and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/toby.git
cd toby

# Copy and configure environment variables
cp .env.example .env

# Install dependencies and build
pnpm i
pnpm build

# Start Toby with the DeFi LP character
pnpm start --character="characters/degenWalrus.character.json"
```

Once Toby is running, open another terminal in the same directory and run:
```bash
pnpm start:client
```

Follow the URL provided to interact with Toby.

## ✨ Features

* 🔗 SUI blockchain integration for LP management
* 📊 DeFiLlama data integration for market analysis
* 💼 Automated position creation and tracking
* 📈 Pool performance analytics
* 🤖 Built on the Eliza Framework

## Additional Requirements

If you encounter Sharp-related errors during startup:
```bash
pnpm install --include=optional sharp
```

## 🛠️ Configuration

Edit your `.env` file with the necessary API keys and configurations:
```env
SUI_PRIVATE_KEY=your_key_here
DEFILLAMA_API_KEY=your_key_here
TWITTER_API_KEY=your_key_here
TWITTER_API_SECRET=your_key_here
TWITTER_ACCESS_TOKEN=your_key_here
TWITTER_ACCESS_TOKEN_SECRET=your_key_here
ANTHROPIC_API_KEY=your_key_here
# Add other required configurations
```

## Community & Support

* GitHub Issues: Bug reports and feature requests
* Discord: Community discussions and support

## Acknowledgments

Built on the [Eliza Framework](https://github.com/elizaos/eliza), with gratitude to the original authors.