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
import { 
    initCetusSDK, 
    TickMath,
    ClmmPoolUtil
} from '@cetusprotocol/cetus-sui-clmm-sdk';
import { BN } from 'bn.js';
import { walletProvider } from "../providers/wallet";
import { parseAccount } from "../utils";

export default {
    name: "ADD_LIQUIDITY",
    similes: [
        "ADD_LP",
        "PROVIDE_LIQUIDITY",
        "DEPOSIT_LP",
        "INCREASE_LIQUIDITY"
    ],
    description: "Add liquidity to a pool with specified token amounts",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = (message.content as Content).text;
        // Check for pool address and amount pattern
        const poolRegex = /0x[a-fA-F0-9]{64}/;
        const amountRegex = /\d+(\.\d+)?/;
        return poolRegex.test(text) && amountRegex.test(text);
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting ADD_LIQUIDITY handler...");

        try {
            // Get wallet info
            const walletInfo = await walletProvider.get(runtime, message, state);
            state.walletInfo = walletInfo;

            // Update state
            state = !state ? 
                await runtime.composeState(message) as State : 
                await runtime.updateRecentMessageState(state);

            // Extract pool address and amount from message
            const text = (message.content as Content).text;
            const poolMatch = text.match(/0x[a-fA-F0-9]{64}/);
            const amountMatch = text.match(/\d+(\.\d+)?/);
            
            if (!poolMatch || !amountMatch) {
                throw new Error("Missing pool address or amount in message");
            }

            const poolAddress = poolMatch[0];
            const amount = new BN(parseFloat(amountMatch[0]) * 1e6); // Convert to 6 decimals

            // Get wallet account
            const suiAccount = parseAccount(runtime);
            if (!suiAccount) {
                throw new Error("Failed to get wallet account");
            }

            // Initialize SDK
            const sdk = initCetusSDK({
                network: 'mainnet'
            });

            // Set sender address
            sdk.senderAddress = suiAccount.getPublicKey().toSuiAddress();

            // Fetch pool data
            const pool = await sdk.Pool.getPool(poolAddress);

            // Calculate tick range
            const lowerTick = TickMath.getPrevInitializableTickIndex(
                new BN(pool.current_tick_index).toNumber(),
                new BN(pool.tickSpacing).toNumber()
            );

            const upperTick = TickMath.getNextInitializableTickIndex(
                new BN(pool.current_tick_index).toNumber(),
                new BN(pool.tickSpacing).toNumber()
            );

            // Calculate liquidity amounts
            const curSqrtPrice = new BN(pool.current_sqrt_price);
            const fix_amount_a = true;
            const slippage = 0.01;

            const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
                lowerTick,
                upperTick,
                amount,
                fix_amount_a,
                true,
                slippage,
                curSqrtPrice
            );

            const amount_a = fix_amount_a ? amount.toString() : liquidityInput.tokenMaxA.toString();
            const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toString() : amount.toString();

            // Create transaction payload
            const addLiquidityPayload = await sdk.Position.createAddLiquidityFixTokenPayload(
                {
                    coinTypeA: pool.coinTypeA,
                    coinTypeB: pool.coinTypeB,
                    pool_id: pool.poolAddress,
                    tick_lower: lowerTick.toString(),
                    tick_upper: upperTick.toString(),
                    fix_amount_a,
                    amount_a,
                    amount_b,
                    slippage,
                    is_open: true,
                    rewarder_coin_types: [],
                    collect_fee: false,
                    pos_id: ''
                },
                {
                    slippage,
                    curSqrtPrice
                }
            );

            // Send transaction
            const transactionResult = await sdk.fullClient.sendTransaction(
                suiAccount,
                addLiquidityPayload
            );

            if (callback) {
                callback({
                    text: `Successfully added liquidity to pool ${poolAddress}. Transaction: ${transactionResult.digest}`,
                    content: {
                        success: true,
                        hash: transactionResult.digest,
                        poolAddress,
                        amountA: amount_a,
                        amountB: amount_b,
                        tokenA: pool.coinTypeA,
                        tokenB: pool.coinTypeB,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error adding liquidity:", error);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                callback({
                    text: `Error adding liquidity: ${errorMessage}`,
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
        // Basic example with pool address and amount
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Add 100 USDC to liquidity pool 0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f71de186859f8f4bd29",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Adding 100 USDC as liquidity...",
                    action: "ADD_LIQUIDITY",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully added liquidity. Transaction: 0x39a8c432d9bdad993a33cc1faf2e9b58fb7dd940c0425f1d6db3997e4b4b05c0",
                },
            },
        ],
        // Example with decimal amount
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Provide 50.5 USDC liquidity to pool 0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f71de186859f8f4bd29",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Adding 50.5 USDC as liquidity...",
                    action: "ADD_LIQUIDITY",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Liquidity successfully added. Transaction: 0x5a71c6d2c6f2af5fd3a2b3faaf4c180ef4eb46f731fe6db6297aee2a8f791367",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;