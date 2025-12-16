import type { ComfyApi, ComfyApp } from "@comfyorg/comfyui-frontend-types";
import type { LGraphNode, LGraphCanvas } from "@comfyorg/litegraph";
import type { DTSamplerExtensions } from "./ComfyUI-DrawThings-gRPC";

declare global {
    interface Window {
        app: ComfyApp;
        comfyAPI: {
            api: {
                api: ComfyApi;
            };
        };
        LGraphCanvas: typeof LGraphCanvas;
    }

    const app: ComfyApp;
}

interface IDTSampler extends LGraphNode {
    constructor: typeof LGraphNode;
    getConfigInputNodes: () => Record<string, LGraphNode[]>;
    coerceWidgetValues: () => void;
    updateDynamicWidgets: () => Promise<void>;
}

type DTSampler = Omit<IDTSampler, "constructor">;