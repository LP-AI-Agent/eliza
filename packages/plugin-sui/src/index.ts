import { Plugin } from "@elizaos/core";
import transferToken from "./actions/transfer.ts";
import { WalletProvider, walletProvider } from "./providers/wallet.ts";
import openLp from "./actions/openLp.ts";
import fetchPositionsAction from "./actions/lpPosCet.ts";
import openAddLP from "./actions/openAddLP.ts";
import cetusAPR from "./actions/cetusAPR.ts";
export { WalletProvider, transferToken as TransferSuiToken };

export const suiPlugin: Plugin = {
    name: "sui",
    description: "Sui Plugin for Eliza",
    actions: [transferToken, openLp, fetchPositionsAction, openAddLP],
    evaluators: [],
    providers: [walletProvider],
};

export default suiPlugin;
