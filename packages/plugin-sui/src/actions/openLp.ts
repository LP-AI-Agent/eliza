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
import { initCetusSDK, secretKeyToSecp256k1Keypair, TickMath, secretKeyToEd25519Keypair } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { BN } from 'bn.js';
import { walletProvider } from "../providers/wallet";
import { parseAccount } from "../utils";

export default {
    name: "OPEN_LP",
    similes: [
        "OPEN_LIQUIDITY_POOL", 
        "CREATE_LIQUIDITY_POSITION", 
        "LP_POSITION",
        "ADD_LIQUIDITY"
    ],
    description: "Open a liquidity pool position using the agent's wallet",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = (message.content as Content).text;
        // Check for pool address pattern
        const poolRegex = /0x[a-fA-F0-9]{64}/;
        return poolRegex.test(text);
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting OPEN_LP handler...");

        try {
            // Get wallet info using the provider
            const walletInfo = await walletProvider.get(runtime, message, state);
            state.walletInfo = walletInfo;

            // Initialize or update state
            state = !state ? 
                await runtime.composeState(message) as State : 
                await runtime.updateRecentMessageState(state);

            // Extract pool address directly from message text
            const text = (message.content as Content).text;
            const poolMatch = text.match(/0x[a-fA-F0-9]{64}/);
            
            if (!poolMatch) {
                throw new Error("No valid pool address found in message");
            }

            const poolAddress = poolMatch[0];

            // Get the wallet account using parseAccount
            const suiAccount = parseAccount(runtime);
            if (!suiAccount) {
                throw new Error("Failed to get wallet account");
            }

            // Initialize SDK
            const sdk = initCetusSDK({
                network: 'mainnet'
            });

            // Get keypair from account
            const keypair = suiAccount;

            // Fetch pool data
            const pool = await sdk.Pool.getPool(poolAddress);

            // Calculate tick range around current price
            const lowerTick = TickMath.getPrevInitializableTickIndex(
                new BN(pool.current_tick_index).toNumber(),
                new BN(pool.tickSpacing).toNumber()
            );

            const upperTick = TickMath.getNextInitializableTickIndex(
                new BN(pool.current_tick_index).toNumber(),
                new BN(pool.tickSpacing).toNumber()
            );

            // Create open position transaction payload
            const openPositionPayload = sdk.Position.openPositionTransactionPayload({
                coinTypeA: pool.coinTypeA,
                coinTypeB: pool.coinTypeB,
                tick_lower: lowerTick.toString(),
                tick_upper: upperTick.toString(),
                pool_id: pool.poolAddress,
            });

            // Send transaction
            const transactionResult = await sdk.fullClient.sendTransaction(
                keypair,
                openPositionPayload
            );

            console.log("LP position opened successfully:", transactionResult.digest);

            if (callback) {
                callback({
                    text: `Successfully opened liquidity pool position for pool ${poolAddress}. Transaction: ${transactionResult.digest}`,
                    content: {
                        success: true,
                        hash: transactionResult.digest,
                        poolAddress: poolAddress,
                        tokenA: pool.coinTypeA,
                        tokenB: pool.coinTypeB,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during LP position opening:", error);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                callback({
                    text: `Error opening liquidity pool position: ${errorMessage}`,
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
        // Basic example with pool address
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Open a liquidity position in the USDC/SUI pool 0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f71de186859f8f4bd29",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you open a position in the USDC/SUI liquidity pool...",
                    action: "OPEN_LP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully opened position in USDC/SUI pool. Transaction: 0x39a8c432d9bdad993a33cc1faf2e9b58fb7dd940c0425f1d6db3997e4b4b05c0",
                },
            },
        ],
        // Example with specific Cetus pool mention
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to provide liquidity to Cetus USDC/SUI pool at address 0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f71de186859f8f4bd29",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll create a liquidity position in the Cetus USDC/SUI pool...",
                    action: "OPEN_LP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Position successfully opened in Cetus USDC/SUI pool. Transaction: 0x5a71c6d2c6f2af5fd3a2b3faaf4c180ef4eb46f731fe6db6297aee2a8f791367",
                },
            },
        ],
        // Example with error handling
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Add liquidity to SUI/USDC pool 0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f71de186859f8f4bd29 please",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you add liquidity to the SUI/USDC pool...",
                    action: "OPEN_LP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully created liquidity position. Your position details:\nPool: SUI/USDC\nTransaction: 0x7c9a4b2c8f1e5d3a6b0c9d8e7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;