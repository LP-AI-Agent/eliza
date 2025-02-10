import { Action, IAgentRuntime, Memory } from "@elizaos/core";
import { DEFI_LAMA_BASE_URL } from "../index";
import { processTVLData } from "../helpers";
const examples = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "What's the current TVL trend in DeFi?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll analyze the current TVL trends across DeFi protocols for you.",
                action: "ANALYZE_TVL_TRENDS",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Based on my analysis, the total TVL across DeFi protocols is $50.2B, showing a 5% increase over the past week. The top protocols by TVL are Aave with $5.1B, Curve with $4.2B, and MakerDAO with $3.8B.",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me the latest DeFi TVL analysis",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll check the current TVL trends and provide an analysis.",
                action: "ANALYZE_TVL_TRENDS",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "The current total TVL in DeFi is $50.2B. We're seeing positive momentum with a 5% weekly growth. Ethereum remains the dominant chain with 55% of total TVL, followed by BSC at 15% and Arbitrum at 10%.",
            },
        },
    ],
];

// Action to analyze TVL trends
export const analyzeTVLTrends: Action = {
    name: "ANALYZE_TVL_TRENDS",
    similes: ["CHECK_TVL_TRENDS", "TVL_ANALYSIS"],
    description: "Analyzes TVL trends across protocols",
    examples: examples,
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.includes("tvl") || message.content.text.includes("analysis");
    },
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            const response = await fetch(`${DEFI_LAMA_BASE_URL}/charts`);
            const data = await response.json();

            // Process and analyze TVL data
            const analysis = processTVLData(data);

            await runtime.messageManager.createMemory({
                id: crypto.randomUUID(),
                content: { 
                    text: "TVL analysis completed",
                    analysis: analysis
                },
                roomId: message.roomId,
                userId: message.userId,
                agentId: runtime.agentId
            });

            return true;
        } catch (error) {
            console.error("Error analyzing TVL trends:", error);
            return false;
        }
    }
};