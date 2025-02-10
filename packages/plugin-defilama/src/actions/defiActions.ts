import { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { DEFI_LAMA_BASE_URL } from "../index";

// Action to fetch top pools by volume
export const fetchTopVolumePoolsAction: Action = {
    name: "FETCH_TOP_VOLUME_POOLS",
    similes: ["GET_HIGH_VOLUME_POOLS", "VOLUME_LEADERS"],
    description: "Fetches pools with the highest trading volume",
    examples: [[
        {
            user: "{{user1}}",
            content: {
                text: "Show me the most active trading pools"
            }
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll fetch the top volume pools.",
                action: "FETCH_TOP_VOLUME_POOLS"
            }
        }
    ]],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes("volume") || 
               message.content.text.toLowerCase().includes("trading");
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: { [key: string]: unknown }, callback: HandlerCallback) => {
        try {
            // Fetch pools and dex volumes
            const [poolsResponse, dexsResponse] = await Promise.all([
                fetch(`${DEFI_LAMA_BASE_URL}/pools`),
                fetch(`${DEFI_LAMA_BASE_URL}/overview/dexs`)
            ]);

            const [poolsData, dexsData] = await Promise.all([
                poolsResponse.json(),
                dexsResponse.json()
            ]);

            // Process and combine data
            const topPools = processVolumeData(poolsData, dexsData);

            if (callback) {
                callback({
                    text: formatVolumeResponse(topPools),
                    data: topPools
                });
            }

            await runtime.messageManager.createMemory({
                id: crypto.randomUUID(),
                content: {
                    text: "Top volume pools data fetched",
                    data: topPools
                },
                roomId: message.roomId,
                userId: message.userId,
                agentId: runtime.agentId
            });

            return true;
        } catch (error) {
            console.error("Error fetching volume data:", error);
            return false;
        }
    }
};

// Action to fetch top fee-generating pools
export const fetchTopFeePoolsAction: Action = {
    name: "FETCH_TOP_FEE_POOLS",
    similes: ["GET_HIGHEST_FEE_POOLS", "BEST_LP_FEES"],
    description: "Fetches pools with the highest fees for Liquidity Providers",
    examples: [[
        {
            user: "{{user1}}",
            content: {
                text: "Which pools have the highest LP fees?"
            }
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll find the pools with highest LP fees.",
                action: "FETCH_TOP_FEE_POOLS"
            }
        }
    ]],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes("fee") || 
               message.content.text.toLowerCase().includes("lp");
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: { [key: string]: unknown }, callback: HandlerCallback) => {
        try {
            // Fetch fees data
            const [poolsResponse, feesResponse] = await Promise.all([
                fetch(`${DEFI_LAMA_BASE_URL}/pools`),
                fetch(`${DEFI_LAMA_BASE_URL}/overview/fees`)
            ]);

            const [poolsData, feesData] = await Promise.all([
                poolsResponse.json(),
                feesResponse.json()
            ]);

            // Process and combine data
            const topFeePools = processFeesData(poolsData, feesData);

            if (callback) {
                callback({
                    text: formatFeesResponse(topFeePools),
                    data: topFeePools
                });
            }

            await runtime.messageManager.createMemory({
                id: crypto.randomUUID(),
                content: {
                    text: "Top fee pools data fetched",
                    data: topFeePools
                },
                roomId: message.roomId,
                userId: message.userId,
                agentId: runtime.agentId
            });

            return true;
        } catch (error) {
            console.error("Error fetching fee data:", error);
            return false;
        }
    }
};

// Action to fetch top yield pools
export const fetchTopYieldPoolsAction: Action = {
    name: "FETCH_TOP_YIELD_POOLS",
    similes: ["GET_HIGHEST_APY_POOLS", "BEST_YIELD_POOLS"],
    description: "Fetches pools offering the highest yields",
    examples: [[
        {
            user: "{{user1}}",
            content: {
                text: "Show me the best yield opportunities"
            }
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll find the highest yielding pools.",
                action: "FETCH_TOP_YIELD_POOLS"
            }
        }
    ]],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes("yield") || 
               message.content.text.toLowerCase().includes("apy");
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: { [key: string]: unknown }, callback: HandlerCallback) => {
        try {
            const response = await fetch(`${DEFI_LAMA_BASE_URL}/pools`);
            const poolsData = await response.json();

            // Process and filter yield data
            const topYieldPools = processYieldData(poolsData);

            if (callback) {
                callback({
                    text: formatYieldResponse(topYieldPools),
                    data: topYieldPools
                });
            }

            await runtime.messageManager.createMemory({
                id: crypto.randomUUID(),
                content: {
                    text: "Top yield pools data fetched",
                    data: topYieldPools
                },
                roomId: message.roomId,
                userId: message.userId,
                agentId: runtime.agentId
            });

            return true;
        } catch (error) {
            console.error("Error fetching yield data:", error);
            return false;
        }
    }
};

// Helper functions
function processVolumeData(poolsData: any, dexsData: any) {
    // Combine and process volume data
    // Return top pools by volume
    return poolsData
        .sort((a: any, b: any) => b.volume - a.volume)
        .slice(0, 10)
        .map((pool: any) => ({
            name: pool.name,
            volume: pool.volume,
            chain: pool.chain,
            protocol: pool.protocol
        }));
}

function processFeesData(poolsData: any, feesData: any) {
    // Process and calculate LP fees
    // Return top pools by fees
    return poolsData
        .sort((a: any, b: any) => b.fees - a.fees)
        .slice(0, 10)
        .map((pool: any) => ({
            name: pool.name,
            fees: pool.fees,
            chain: pool.chain,
            protocol: pool.protocol
        }));
}

function processYieldData(poolsData: any) {
    // Filter and sort by APY
    // Return top yield opportunities
    return poolsData
        .sort((a: any, b: any) => b.apy - a.apy)
        .slice(0, 10)
        .map((pool: any) => ({
            name: pool.name,
            apy: pool.apy,
            chain: pool.chain,
            protocol: pool.protocol,
            tvl: pool.tvl
        }));
}

// Response formatters
function formatVolumeResponse(data: any) {
    return `Top Trading Volume Pools:\n${data
        .map((pool: any, i: number) => 
            `${i + 1}. ${pool.name} (${pool.protocol} on ${pool.chain})\n   Volume: $${formatNumber(pool.volume)}`
        )
        .join('\n')}`;
}

function formatFeesResponse(data: any) {
    return `Top Fee-Generating Pools:\n${data
        .map((pool: any, i: number) => 
            `${i + 1}. ${pool.name} (${pool.protocol} on ${pool.chain})\n   Daily Fees: $${formatNumber(pool.fees)}`
        )
        .join('\n')}`;
}

function formatYieldResponse(data: any) {
    return `Top Yield Pools:\n${data
        .map((pool: any, i: number) => 
            `${i + 1}. ${pool.name} (${pool.protocol} on ${pool.chain})\n   APY: ${pool.apy.toFixed(2)}%\n   TVL: $${formatNumber(pool.tvl)}`
        )
        .join('\n')}`;
}

function formatNumber(num: number) {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
        notation: 'compact',
        compactDisplay: 'short'
    }).format(num);
}

export const defiActions = [
    fetchTopVolumePoolsAction,
    fetchTopFeePoolsAction,
    fetchTopYieldPoolsAction
];