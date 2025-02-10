import { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";

interface Pool {
    chain: string;
    project: string;
    symbol: string;
    tvlUsd: number;
    apyBase?: number;
    apyReward?: number;
    apy: number;
    stablecoin: boolean;
    volumeUsd1d: number | null;
    volumeUsd7d: number | null;
    ilRisk: string;
}

const MIN_TVL = 1_000_000; // $1M minimum TVL
const CHAIN_FILTER = "SUI"; // Filter for SUI blockchain only

function formatNumber(num: number): string {
    if (!num) return '$0';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
}

export const analyzePools: Action = {
    name: "ANALYZE_SUI_DEFI_POOLS",
    similes: ["CHECK_SUI_POOLS", "SHOW_TOP_SUI_POOLS"],
    description: "Analyzes SUI blockchain DeFi pools for best APY, volume, and stablecoin opportunities",
    examples: [[
        {
            user: "{{user1}}",
            content: { text: "Show me the best SUI DeFi pools right now" }
        },
        {
            user: "{{agent}}",
            content: { 
                text: "Let me check the current SUI DeFi pool opportunities and break them down for you.",
                action: "ANALYZE_SUI_DEFI_POOLS"
            }
        }
    ]],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();
        return (text.includes("pool") || text.includes("apy") || text.includes("yield")) &&
               (text.includes("sui") || text.includes("all"));
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: { [key: string]: unknown }, callback: HandlerCallback) => {
        try {
            // Fetch pools data
            const response = await fetch('https://yields.llama.fi/pools');
            if (!response.ok) throw new Error('Failed to fetch pools data');
            
            const data = await response.json();
            const allPools: Pool[] = data.data;
            
            // Filter for SUI pools only
            const suiPools = allPools.filter(p => p.chain.toUpperCase() === CHAIN_FILTER);
            
            if (suiPools.length === 0) {
                const noPoolsMessage = "No active SUI pools found at the moment. This might be due to API limitations or temporary data unavailability.";
                if (callback) {
                    callback({ text: noPoolsMessage });
                }
                return true;
            }

            // Top APY pools with decent TVL
            const topApyPools = suiPools
                .filter(p => p.tvlUsd >= MIN_TVL && p.apy < 1000) // Filter unrealistic APYs
                .sort((a, b) => b.apy - a.apy)
                .slice(0, 5);

            // Top volume pools
            const topVolumePools = suiPools
                .filter(p => p.volumeUsd1d && p.volumeUsd1d > 0 && p.tvlUsd >= MIN_TVL)
                .sort((a, b) => (b.volumeUsd1d || 0) - (a.volumeUsd1d || 0))
                .slice(0, 5);

            // Top stablecoin pools (combining TVL and APY)
            const stablePools = suiPools
                .filter(p => p.stablecoin && p.tvlUsd >= MIN_TVL && p.apy < 100) // Filter unrealistic APYs
                .sort((a, b) => (b.apy * Math.log10(b.tvlUsd)) - (a.apy * Math.log10(a.tvlUsd)))
                .slice(0, 5);

            // Format response
            const formattedResponse = `🌊 SUI DeFi Pool Analysis 📊

🔥 Top APY Pools on SUI (With $1M+ TVL):
${topApyPools.length ? topApyPools.map((p, i) => 
    `${i + 1}. ${p.project}
    💰 Pool: ${p.symbol}
    📈 APY: ${p.apy.toFixed(2)}%
    💎 TVL: ${formatNumber(p.tvlUsd)}
    ⚠️ IL Risk: ${p.ilRisk}`
).join('\n\n') : "No pools matching criteria found"}

📊 Highest Volume Pools on SUI:
${topVolumePools.length ? topVolumePools.map((p, i) => 
    `${i + 1}. ${p.project}
    💰 Pool: ${p.symbol}
    📈 24h Volume: ${formatNumber(p.volumeUsd1d || 0)}
    💎 TVL: ${formatNumber(p.tvlUsd)}
    🔄 APY: ${p.apy.toFixed(2)}%`
).join('\n\n') : "No pools with significant volume found"}

🏦 Best Stablecoin Opportunities on SUI:
${stablePools.length ? stablePools.map((p, i) => 
    `${i + 1}. ${p.project}
    💰 Pool: ${p.symbol}
    📈 APY: ${p.apy.toFixed(2)}%
    💎 TVL: ${formatNumber(p.tvlUsd)}
    ⚠️ IL Risk: ${p.ilRisk}`
).join('\n\n') : "No stablecoin pools matching criteria found"}

Note: Always DYOR and check protocol risks before investing. Higher APY often means higher risk.`;

            if (callback) {
                callback({
                    text: formattedResponse,
                    data: {
                        topApyPools,
                        topVolumePools,
                        stablePools
                    }
                });
            }

            // Store analysis in memory
            await runtime.messageManager.createMemory({
                id: crypto.randomUUID(),
                content: { 
                    text: formattedResponse,
                    data: {
                        topApyPools,
                        topVolumePools,
                        stablePools
                    }
                },
                roomId: message.roomId,
                userId: message.userId,
                agentId: runtime.agentId
            });

            return true;
        } catch (error) {
            console.error('SUI pool analysis failed:', error);
            return false;
        }
    }
};