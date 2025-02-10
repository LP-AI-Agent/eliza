export function formatTVL(tvl: number) {
    return (tvl / 1e9).toFixed(2) + "B";
}

export function analyzeTrends(data: any) {
    return {
        dailyChange: ((data[data.length - 1].totalLiquidityUSD - data[data.length - 2].totalLiquidityUSD) / data[data.length - 2].totalLiquidityUSD * 100).toFixed(2) + '%',
        weeklyChange: ((data[data.length - 1].totalLiquidityUSD - data[data.length - 7].totalLiquidityUSD) / data[data.length - 7].totalLiquidityUSD * 100).toFixed(2) + '%'
    };
}

export function processTVLData(data: any) {
    // Process TVL data and return insights
    return {
        totalTVL: data.totalTVL,
        trends: analyzeTrends(data),
        topMovers: findTopMovers(data)
    };
}
export function getTopProtocols(protocols: any[], count: number) {
    return protocols
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, count)
        .map(p => `${p.name} ($${formatTVL(p.tvl)})`)
        .join(", ");
}
export function findTopMovers(data: any) {
    return {
        gainers: data.slice(-2).sort((a: any, b: any) => b.totalLiquidityUSD - a.totalLiquidityUSD).slice(0, 3),
        losers: data.slice(-2).sort((a: any, b: any) => a.totalLiquidityUSD - b.totalLiquidityUSD).slice(0, 3)
    };
}