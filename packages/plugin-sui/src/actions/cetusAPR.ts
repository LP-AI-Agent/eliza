import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    type Action,
} from "@elizaos/core";
import axios from 'axios';

interface CetusPoolAprInfo {
    name: string;
    symbol: string;
    apr_24h: string;
    apr_7day: string;
    apr_30day: string;
    total_apr: string;
    rewarder_apr: string[];
}

export default {
    name: "FETCH_CETUS_APR",
    similes: [
        "GET_CETUS_APR",
        "CHECK_CETUS_APR",
        "CETUS_POOL_APR",
        "VIEW_CETUS_APR",
        "SHOW_CETUS_APR"
    ],
    description: "Fetch and display APR information for a specific Cetus liquidity pool using Cetus API",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = (message.content as Content).text;
        // Check for pool address pattern and mention of Cetus or APR
        const poolRegex = /0x[a-fA-F0-9]{64}/;
        const keywordRegex = /\b(apr|cetus)\b/i;
        return poolRegex.test(text) && keywordRegex.test(text);
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting FETCH_CETUS_APR handler...");

        try {
            // Extract pool address from message
            const text = (message.content as Content).text;
            const poolMatch = text.match(/0x[a-fA-F0-9]{64}/);
            
            if (!poolMatch) {
                throw new Error("No valid Cetus pool address found in message");
            }

            const poolAddress = poolMatch[0];

            // Fetch APR data from Cetus API
            const response = await axios.get('https://api-sui.cetus.zone/v2/sui/swap/count');
            const pools = response.data.data.pools;
            
            const pool = pools.find((p: any) => p.swap_account === poolAddress);
            
            if (!pool) {
                throw new Error('Cetus pool not found');
            }

            const aprInfo: CetusPoolAprInfo = {
                name: pool.name,
                symbol: pool.symbol,
                apr_24h: pool.apr_24h,
                apr_7day: pool.apr_7day,
                apr_30day: pool.apr_30day,
                total_apr: pool.total_apr,
                rewarder_apr: pool.rewarder_apr
            };

            // Format APR message
            const aprMessage = [
                `Cetus Pool: ${aprInfo.name} (${aprInfo.symbol})`,
                'APR Information:',
                `• 24h APR: ${aprInfo.apr_24h}`,
                `• 7d APR: ${aprInfo.apr_7day}`,
                `• 30d APR: ${aprInfo.apr_30day}`,
                `• Total APR: ${aprInfo.total_apr}`
            ];

            if (aprInfo.rewarder_apr && aprInfo.rewarder_apr.length > 0) {
                aprMessage.push('• Cetus Rewarder APRs: ' + aprInfo.rewarder_apr.join(', '));
            }

            if (callback) {
                callback({
                    text: aprMessage.join('\n'),
                    content: {
                        success: true,
                        poolAddress,
                        aprInfo
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error fetching Cetus pool APR:", error);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                callback({
                    text: `Error fetching Cetus pool APR: ${errorMessage}`,
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
        // Basic Cetus APR check example
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the Cetus APR for pool 0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f71de186859f8f4bd29?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me check the Cetus pool APR information...",
                    action: "FETCH_CETUS_APR",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Cetus Pool: USDC-SUI\nAPR Information:\n• 24h APR: 12.5%\n• 7d APR: 11.8%\n• 30d APR: 10.9%\n• Total APR: 13.2%\n• Cetus Rewarder APRs: 2.1%",
                },
            },
        ],
        // Cetus APR check with different phrasing
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me Cetus APR stats for 0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f71de186859f8f4bd29",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Fetching Cetus pool APR statistics...",
                    action: "FETCH_CETUS_APR",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Cetus Pool: USDC-SUI\nAPR Information:\n• 24h APR: 11.9%\n• 7d APR: 12.1%\n• 30d APR: 11.5%\n• Total APR: 12.8%\n• Cetus Rewarder APRs: 1.9%",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;