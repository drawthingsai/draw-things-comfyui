import type { LGraphNode, IWidget } from "@comfyorg/litegraph";
import type { ComfyExtension } from "@comfyorg/comfyui-frontend-types";

const extension: ComfyExtension = {
    name: "dynamicInputs",

    beforeRegisterNodeDef(nodeType, nodeData, app) {
        if ((nodeType as any).comfyClass === "DrawThingsLoRA") {
            // update inputs when a new node is added
            setCallback(nodeType.prototype, "onAdded", function (this: any, graph: any) {
                updateInputs(this)
            })

            // or when the model changes
            setCallback(nodeType.prototype, "onWidgetChanged", function (this: any, name: string, value: any, old_Value: any, widget: any) {
                updateInputs(this)
            })
        }
    },
}

export default extension;

function updateInputs(node: LGraphNode) {
    const s = saveSize(node)

    // the first input should always be lora
    if (node.inputs.length < 1 || node.inputs.length > 2 || node.inputs[0].type !== "DT_LORA") {
        for (let i = node.inputs.length - 1; i >= 0; i--) {
            node.removeInput(i)
        }
        node.addInput("lora", "DT_LORA")
    }

    const modelWidget = node?.widgets?.find((w) => (w.options as any)?.modelType)
    if (!modelWidget) return
    const modifier = (modelWidget.value as any)?.value?.modifier

    if (modifier) {
        if (node.inputs.length < 2 || node.inputs[1]?.type !== "IMAGE") {
            node.removeInput(1)
            node.addInput("control_image", "IMAGE")
        }
    } else {
        while (node.inputs.length > 1) {
            node.removeInput(1)
        }
    }
    s()
}

function saveSize(node: LGraphNode) {
    const width = node.width
    return () => node.setSize([width, node.computeSize()[1]])
}

export function setCallback<T extends object, K extends keyof T>(target: T, callbackName: K, callback: T[K]) {
    const originalCallback = target[callbackName]
    target[callbackName] = function (this: any, ...args: any[]) {
        const r = (originalCallback as any)?.apply(this, args)
        ;(callback as any)?.apply(this, args)
        return r
    } as any
}

