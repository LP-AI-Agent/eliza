import { Plugin } from "@elizaos/core";
import { topApyPoolsProvider } from "./providers/topApyPoolsProvider";
import { topVolumePoolsProvider } from "./providers/topVolumePoolsProvider";
import { suiPoolsProvider } from "./providers/suiPoolsProvider";
import { analyzePools } from "./actions/analyzeSuiPools";
// DeFi Lama API endpoints
export const DEFI_LAMA_BASE_URL = "https://api.llama.fi";
export const defilamaPlugin: Plugin = {
    name: "defilama",
    description: "DefiLama plugin",
    actions: [
        analyzePools
    ],
    evaluators: [],
    providers: [
        topApyPoolsProvider,
        suiPoolsProvider,   
        topVolumePoolsProvider
    ],
};
export default defilamaPlugin;

