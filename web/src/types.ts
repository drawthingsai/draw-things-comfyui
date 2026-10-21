import type { ComfyExtension as ComfyExtensionBase } from "@comfyorg/comfyui-frontend-types";
import type { LGraphNode } from "@comfyorg/litegraph";
// import type { DTSamplerExtensions } from "./ComfyUI-DrawThings-gRPC";

export interface IDTSampler extends Omit<LGraphNode, "constructor"> {
    constructor: typeof LGraphNode;
    getConfigInputNodes: () => Record<string, LGraphNode[]>;
    coerceWidgetValues: () => void;
    updateDynamicWidgets: () => Promise<void>;
}

export type DTSampler = Omit<IDTSampler, "constructor">;

type RemoveIndexSignature<T> = {
    [K in keyof T as
        string extends K ? never :
        number extends K ? never :
        symbol extends K ? never :
        K
    ]: T[K];
};

type ExtensionSetting = Omit<
    NonNullable<ComfyExtensionBase["settings"]>[number],
    "id"
> & { id: string };

export interface ComfyExtension
    extends Omit<RemoveIndexSignature<ComfyExtensionBase>, "settings"> {
    settings?: ExtensionSetting[];
}
