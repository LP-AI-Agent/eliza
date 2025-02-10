import { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";

// Define the Pool interface
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

// Constants
const MIN_TVL = 1_000_000; // $1M minimum TVL
const CHAIN_FILTER = "SUI";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const MAX_RETRIES = 3;

// Cache interface
interface CacheEntry {
    timestamp: number;
    data: any;
}

// Helper function to format large numbers
function formatNumber(num: number): string {
    if (!num) return '$0';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
}

// Implement backoff strategy
const backoff = async (attempt: number) => {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    await new Promise((resolve) => setTimeout(resolve, delay));
};

// Cache management
const cache: Map<string, CacheEntry> = new Map();

async function fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
): Promise<T> {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    const data = await fetcher();
    cache.set(key, {
        timestamp: Date.now(),
        data
    });
    return data;
}

export const suiPoolsProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                // Fetch pools data with caching
                const pools: Pool[] = await fetchWithCache(
                    'sui_pools',
                    async () => {
                        const response = await fetch('https://yields.llama.fi/pools');
                        if (!response.ok) throw new Error('Failed to fetch pools data');
                        const data = await response.json();
                        return data.data;
                    }
                );

                // Filter for SUI pools only
                const suiPools = pools.filter(p => 
                    p.chain.toUpperCase() === CHAIN_FILTER && 
                    p.tvlUsd >= MIN_TVL
                );

                if (suiPools.length === 0) {
                    return "No active SUI pools found with sufficient TVL at the moment.";
                }

                // Get top stablecoin pools
                const stablePools = suiPools
                    .filter(p => p.stablecoin && p.apy < 100)
                    .sort((a, b) => (b.apy * Math.log10(b.tvlUsd)) - (a.apy * Math.log10(a.tvlUsd)))
                    .slice(0, 3);

                // Get top APY pools
                const apyPools = suiPools
                    .filter(p => p.apy < 1000) // Filter unrealistic APYs
                    .sort((a, b) => b.apy - a.apy)
                    .slice(0, 3);

                // Format the comprehensive response
                const response = [
                    "🌊 SUI DeFi Pools Overview",
                    "",
                    "🔥 Top APY Pools:",
                    ...apyPools.map((p, i) => 
                        `${i + 1}. ${p.project}
   💰 Pool: ${p.symbol}
   📈 APY: ${p.apy.toFixed(2)}%
   💎 TVL: ${formatNumber(p.tvlUsd)}
   ⚠️ IL Risk: ${p.ilRisk}`
                    ),
                    "",
                    "🏦 Stablecoin Opportunities:",
                    ...stablePools.map((p, i) => 
                        `${i + 1}. ${p.project}
   💰 Pool: ${p.symbol}
   📈 APY: ${p.apy.toFixed(2)}%
   💎 TVL: ${formatNumber(p.tvlUsd)}
   ⚠️ IL Risk: ${p.ilRisk}`
                    ),
                    "",
                    "Note: Always verify protocol safety and consider risks before investing."
                ].join('\n');

                // Store the analysis in memory for future reference
                await runtime.messageManager.createMemory({
                    id: crypto.randomUUID(),
                    content: {
                        text: response,
                        data: {
                            apyPools,
                            stablePools,
                            timestamp: Date.now()
                        }
                    },
                    roomId: message.roomId,
                    userId: message.userId,
                    agentId: runtime.agentId
                });

                return response;

            } catch (error) {
                console.error(`SUI Pools Provider Error (attempt ${attempt + 1}):`, error);
                
                if (attempt === MAX_RETRIES - 1) {
                    // On final attempt, try to get cached data if available
                    const cached = cache.get('sui_pools');
                    if (cached) {
                        return `⚠️ Live data unavailable. Showing cached data from ${new Date(cached.timestamp).toLocaleTimeString()}:\n\n${cached.data}`;
                    }
                    return "Unable to fetch SUI pools data. Please try again later.";
                }
                
                await backoff(attempt);
                attempt++;
            }
        }

        return "Service temporarily unavailable. Please try again later.";
    }
};

// Optional: Cache invalidation function for manual cache clearing
export const invalidatePoolsCache = () => {
    cache.delete('sui_pools');
};