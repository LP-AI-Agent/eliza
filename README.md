# Toby: Professional-Grade DeFi Liquidity Management on SUI

Toby is an AI-powered liquidity management agent that enables data-driven position management and optimization for DeFi liquidity providers on SUI blockchain.

## 🎯 Vision

DeFi liquidity provision should be accessible, data-driven, and profitable for everyone. Toby aims to bridge the gap between sophisticated trading tools and the current DeFi LP experience.

## 🔍 Problem

Current DeFi LP management is challenging:
- Difficult to track position performance and IL
- No comprehensive analytics for decision making
- Time-consuming manual position management
- Limited access to market insights
- High risk of losses due to poor optimization

## 💡 Solution

Toby provides:
- Automated LP position tracking and management
- Data-driven pool selection using DeFiLlama analytics
- Real-time performance monitoring
- Community-driven insights and strategies
- Professional-grade tools accessible to everyone

## 🚀 Current Features

### DeFiLlama Integration
- Pool performance analytics
- TVL and volume tracking
- APY comparisons
- Market trend analysis

### SUI/Cetus Integration
- Direct LP position management
- Portfolio tracking
- Performance monitoring

## 🔧 Technical Implementation

### Plugin Architecture



#### DeFiLlama Plugin
```
plugin-defilama/
├── src/
│   ├── actions/
│   │   ├── analyzePools.ts
│   │   ├── analyzeSuiPools.ts
│   │   ├── analyzeTVLTrends.ts
│   │   ├── defiActions.ts
│   │   ├── fetchProtocolData.ts
│   │   └── index.ts
│   └── providers/
│       ├── index.ts
│       ├── suiPoolsProvider.ts
│       ├── topApyPoolsProvider.ts
│       └── topVolumePoolsProvider.ts
├── helpers.ts
└── index.ts
```

Key Features:
- Pool analysis and comparison
- SUI-specific pool analytics
- TVL trend analysis
- Protocol data fetching
- Custom providers for APY and volume rankings

#### SUI Plugin Extensions
```
plugin-sui/
├── src/
│   ├── actions/
│   │   ├── lpPosCet.ts        # Cetus LP position tracking
│   │   ├── openLp.ts          # LP position creation
│   │   └── transfer.ts        # Asset transfers
│   └── providers/
└── utils.ts
```

Key Features:
- Direct integration with Cetus DEX
- LP position management
- Asset transfer capabilities
- Position tracking and analysis

## Implementation Details

### DeFiLlama Integration
- **Pool Analysis**: Comprehensive analytics for liquidity pools
- **TVL Tracking**: Monitor and analyze Total Value Locked trends
- **APY Rankings**: Track and compare yields across pools
- **Volume Analysis**: Identify high-performing pools by volume

### SUI/Cetus Integration
- **Position Management**: Open and track LP positions on Cetus
- **Portfolio Tracking**: Monitor active positions and performance

### DeFi-Oriented Agent Architecture
- Enhanced prompts for DeFi context
- Specialized character configuration

## 🚀 Quick Start

### Prerequisites
* Node.js 23+
* pnpm

### Installation and Setup

```bash
# Clone the repository
git clone https://github.com/LP-AI-Agent/toby.git
cd toby

# Copy and configure environment variables
cp .env.example .env

# Install dependencies and build
pnpm i
pnpm build

# Start Toby with the DeFi LP character
pnpm start --character="characters/degenWalrus.character.json"
```

For client interaction, open another terminal and run:
```bash
pnpm start:client
```

## 🛠️ Configuration

Required environment variables:
```env
SUI_PRIVATE_KEY=your_key_here
DEFILLAMA_API_KEY=your_key_here
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
TWITTER_EMAIL=your_email
ANTHROPIC_API_KEY=your_key_here
```


## Project Structure

```
src/
├── plugins/
│   ├── defillama/
│   │   ├── actions/
│   │   │   ├── getPoolStats.ts
│   │   │   └── analyzeMarket.ts
│   │   └── providers/
│   │       ├── marketData.ts
│   │       └── poolAnalytics.ts
│   └── sui/
│       ├── actions/
│       │   ├── openPosition.ts
│       │   └── fetchPositions.ts
│       └── providers/
│           └── cetusSDK.ts
└── character/
    └── degenWalrus.character.json
```

## Additional Requirements

For Sharp-related errors:
```bash
pnpm install --include=optional sharp
```

## Community & Support

* GitHub Issues: Bug reports and feature requests
* Discord: Community discussions and support

## Acknowledgments

Built on the [Eliza Framework](https://github.com/elizaos/eliza), with gratitude to the original authors.
