import { 
    Action, 
    ActionExample, 
    Content, 
    HandlerCallback, 
    IAgentRuntime, 
    Memory, 
    ModelClass, 
    State,
    composeContext,
    elizaLogger,
    generateObject
} from '@elizaos/core';
import { z } from 'zod';
import { initCetusSDK, TickMath, ClmmPoolUtil } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { BN } from 'bn.js';

// Enhanced interfaces with proper typing
interface TokenPrice {
    price: number;
    symbol: string;
    timestamp: number;
    confidence: number;
}

interface PriceData {
    coins: Record<string, TokenPrice>;
}

interface PositionData {
    poolAddress: string;
    tokenPair: string;
    amounts: Record<string, number>;
    valueUSD: number;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
}

interface PositionsResult {
    positions: PositionData[];
    summary: {
        tokens: Record<string, number>;
        totalValueUSD: number;
    };
}

// Enhanced token mapping with better maintainability
const TOKEN_SYMBOLS: Record<string, string> = {
    '::sui::SUI': 'SUI',
    '::usdc::USDC': 'USDC',
    '::usdt::USDT': 'USDT',
    '::cetus::CETUS': 'CETUS',
    '::eth::ETH': 'ETH',
    '::btc::BTC': 'BTC',
    '::apt::APT': 'APT',
    '::sol::SOL': 'SOL',
    '::bnb::BNB': 'BNB',
    '::tia::TIA': 'TIA',
    '::hasui::HASUI': 'HASUI'
};

// Improved utility functions with error handling
function getTokenSymbol(coinType: string): string {
    for (const [key, symbol] of Object.entries(TOKEN_SYMBOLS)) {
        if (coinType.includes(key)) return symbol;
    }
    
    try {
        const parts = coinType.split('::');
        return parts.length >= 3 ? parts[parts.length - 1] : coinType.slice(0, 10) + '...';
    } catch (error) {
        console.error('Error parsing token symbol:', error);
        return 'UNKNOWN';
    }
}

async function fetchTokenPrices(tokens: Set<string>): Promise<Record<string, number>> {
    try {
        const coingeckoIds = Array.from(tokens)
            .map(symbol => `coingecko:${symbol.toLowerCase()}`)
            .join(',');

        const response = await fetch(`https://coins.llama.fi/prices/current/${coingeckoIds}`);
        if (!response.ok) {
            throw new Error(`Price fetch failed: ${response.statusText}`);
        }

        const data: PriceData = await response.json();
        return Array.from(tokens).reduce((acc, symbol) => {
            const price = data.coins[`coingecko:${symbol.toLowerCase()}`]?.price ?? 0;
            acc[symbol] = price;
            return acc;
        }, {} as Record<string, number>);
    } catch (error) {
        console.error('Error fetching prices:', error);
        return Array.from(tokens).reduce((acc, symbol) => {
            acc[symbol] = symbol === 'USDC' || symbol === 'USDT' ? 1 : 0;
            return acc;
        }, {} as Record<string, number>);
    }
}

function formatAmount(amount: string | number, decimals: number = 9): number {
    try {
        const numAmount = typeof amount === 'string' ? Number(amount) : amount;
        return numAmount / Math.pow(10, decimals);
    } catch (error) {
        console.error('Error formatting amount:', error);
        return 0;
    }
}

async function getPositionsData(walletAddress: string): Promise<PositionsResult> {
    const sdk = initCetusSDK({ network: 'mainnet' });
    const uniqueTokens = new Set<string>();
    const positionsData: PositionData[] = [];

    try {
        const positions = await sdk.Position.getPositionList(walletAddress, [], false);
        
        // Collect unique tokens
        positions.forEach(position => {
            uniqueTokens.add(getTokenSymbol(position.coin_type_a));
            uniqueTokens.add(getTokenSymbol(position.coin_type_b));
        });

        const tokenPrices = await fetchTokenPrices(uniqueTokens);

        // Process positions with better error handling
        for (const position of positions) {
            try {
                const pool = await sdk.Pool.getPool(position.pool);
                const curSqrtPrice = new BN(pool.current_sqrt_price);
                const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_lower_index);
                const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_upper_index);

                const currentAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
                    new BN(position.liquidity),
                    curSqrtPrice,
                    lowerSqrtPrice,
                    upperSqrtPrice,
                    false
                );

                const tokenASymbol = getTokenSymbol(position.coin_type_a);
                const tokenBSymbol = getTokenSymbol(position.coin_type_b);
                
                const tokenAAmount = formatAmount(currentAmounts.coinA.toString());
                const tokenBAmount = formatAmount(currentAmounts.coinB.toString());
                
                positionsData.push({
                    poolAddress: position.pool,
                    tokenPair: `${tokenASymbol}-${tokenBSymbol}`,
                    amounts: {
                        [tokenASymbol]: tokenAAmount,
                        [tokenBSymbol]: tokenBAmount
                    },
                    valueUSD: tokenAAmount * (tokenPrices[tokenASymbol] || 0) + 
                             tokenBAmount * (tokenPrices[tokenBSymbol] || 0),
                    tickLower: position.tick_lower_index,
                    tickUpper: position.tick_upper_index,
                    liquidity: position.liquidity
                });
            } catch (error) {
                console.error(`Error processing position ${position.pool}:`, error);
                // Continue with next position instead of failing entirely
                continue;
            }
        }

        // Calculate summary with error handling
        const summary = positionsData.reduce((acc, position) => {
            try {
                // Sum token amounts
                Object.entries(position.amounts).forEach(([token, amount]) => {
                    acc.tokens[token] = (acc.tokens[token] || 0) + amount;
                });
                // Sum USD value
                acc.totalValueUSD += position.valueUSD;
            } catch (error) {
                console.error('Error calculating summary for position:', error);
            }
            return acc;
        }, { tokens: {}, totalValueUSD: 0 } as PositionsResult['summary']);

        return { positions: positionsData, summary };
    } catch (error) {
        console.error('Error in getPositionsData:', error);
        throw error;
    }
}

// Action-specific interfaces
interface PositionsFetchContent extends Content {
    walletAddress: string;
}

function isPositionsFetchContent(content: Content): content is PositionsFetchContent {
    return typeof content.walletAddress === "string" && 
           content.walletAddress.length > 0 && 
           content.walletAddress.startsWith('0x');
}

const positionsFetchTemplate = `Respond with a JSON markdown block containing only the extracted wallet address.

Example response:
\`\`\`json
{
    "walletAddress": "0x67550464714043e120f2d21bf139636532b6b2eddd0cbfba0081878e075d782d"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the Sui wallet address for fetching liquidity pool positions.

Respond with a JSON markdown block containing only the extracted values.`;

const fetchPositionsAction: Action = {
    name: "FETCH_POSITIONS",
    similes: [
        "GET_LIQUIDITY_POSITIONS", 
        "LIST_POSITIONS",
        "CHECK_POSITIONS",
        "WALLET_POSITIONS"
    ],
    description: "Fetch all liquidity pool positions for a given wallet address",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = (message.content as Content).text;
        // Check for wallet address pattern
        const walletRegex = /0x[a-fA-F0-9]{64}/;
        return walletRegex.test(text);
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting FETCH_POSITIONS handler...");

        try {
            // Initialize or update state
            state = !state ? 
                await runtime.composeState(message) as State : 
                await runtime.updateRecentMessageState(state);

            // Extract wallet address directly from message text
            const text = (message.content as Content).text;
            const walletMatch = text.match(/0x[a-fA-F0-9]{64}/);
            
            if (!walletMatch) {
                throw new Error("No valid wallet address found in message");
            }

            const walletAddress = walletMatch[0];

            // Validate wallet address format
            if (!walletAddress.startsWith('0x') || walletAddress.length !== 66) {
                throw new Error("Invalid wallet address format");
            }

            // Fetch positions
            const positionsResult = await getPositionsData(walletAddress);

            // Store in memory
            await runtime.documentsManager.createMemory({
                id: crypto.randomUUID(),
                agentId: runtime.agentId,
                content: {
                    text: `Fetched ${positionsResult.positions.length} liquidity pool positions`,
                    positions: positionsResult.positions,
                    summary: positionsResult.summary
                },
                userId: message.userId,
                roomId: message.roomId,
                createdAt: Date.now(),
            });

            // Format response
            if (callback) {
                const formattedTokens = Object.entries(positionsResult.summary.tokens)
                    .map(([token, amount]) => `${token}: ${amount.toFixed(6)}`)
                    .join('\n');

                callback({
                    text: [
                        `Fetched ${positionsResult.positions.length} liquidity pool positions for wallet ${walletAddress}.`,
                        `\nTotal Value: $${positionsResult.summary.totalValueUSD.toFixed(2)}`,
                        `\nToken Breakdown:\n${formattedTokens}`
                    ].join(''),
                    content: {
                        success: true,
                        walletAddress: walletAddress,
                        positionsCount: positionsResult.positions.length,
                        totalValueUSD: positionsResult.summary.totalValueUSD,
                        tokens: positionsResult.summary.tokens
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error in FETCH_POSITIONS handler:", error);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                callback({
                    text: `Error fetching liquidity pool positions: ${errorMessage}`,
                    content: { 
                        error: errorMessage,
                        success: false
                    },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Fetch my liquidity pool positions for wallet 0x67550464714043e120f2d21bf139636532b6b2eddd0cbfba0081878e075d782d",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll fetch the liquidity pool positions now...",
                    action: "FETCH_POSITIONS",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Fetched 3 liquidity pool positions for the wallet.\n\nTotal Value: $1,234.56\n\nToken Breakdown:\nSUI: 10.245678\nUSDC: 500.123456",
                },
            },
        ],
    ] as ActionExample[][],
};

export default fetchPositionsAction;
