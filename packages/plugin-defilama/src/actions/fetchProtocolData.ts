import { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { DEFI_LAMA_BASE_URL } from "../index";

export const fetchProtocolData: Action = {
    name: "FETCH_PROTOCOL_DATA",
    similes: ["GET_PROTOCOL_DATA", "PROTOCOL_INFO"],
    description: "Fetches TVL and other data for a specific protocol",
    examples: [[
        {
            user: "{{user1}}",
            content: {
                text: "Get protocol data for Uniswap"
            }
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll fetch the protocol data for Uniswap.",
                action: "FETCH_PROTOCOL_DATA"
            }
        },
        {
            user: "{{agent}}",
            content: {
                text: "Here's the protocol data for Uniswap: TVL is $500M..."
            }
        }
    ]],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.includes("protocol");
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: { [key: string]: unknown; }, callback: HandlerCallback) => {
        try {            
            const response = await fetch(`${DEFI_LAMA_BASE_URL}/protocols`);
            const data = await response.json();
            
            await runtime.messageManager.createMemory({
                id: crypto.randomUUID(),
                content: { 
                    text: "Protocol data fetched successfully",
                    data: data
                },
                roomId: message.roomId,
                userId: message.userId,
                agentId: runtime.agentId
            });

            return true;
        } catch (error) {
            console.error("Error fetching protocol data:", error);
            return false;
        }
    }
};
