import { nodePackVersion } from './ComfyUI-DrawThings-gRPC.js'
import { findWidgetByName, updateProto } from "./util.js"
import { showWidget } from './widgets.js'
import type { LGraphNode, IWidget } from "@comfyorg/litegraph";
import type { ComfyExtension } from "@comfyorg/comfyui-frontend-types";

function updateControlWidgets(node: LGraphNode) {
    const widget = findWidgetByName(node, "control_name")
    const val = widget?.value as any;
    const modelInfo = val?.value
    const isModelSelected = !!modelInfo
    const modifier = modelInfo?.modifier
    const cnetType = modelInfo?.type

    const inputTypeNode = findWidgetByName(node, "control_input_type")

    // control_input_type, hide by default
    // set this automatically based on modifier
    // only show if type=controlnetunion or modifier is missing
    const showInputType = isModelSelected && (!modifier || cnetType === "controlnetunion")
    showWidget(node, "control_input_type", showInputType)

    // global_average_pooling, hide by default
    // visible if model.globalAveragePooling = true
    const showGAP = modelInfo?.global_average_pooling
    showWidget(node, "global_average_pooling", showGAP)

    // down_sampling_rate, hide by default
    // visible if control_input_type or modifier is lowquality, blur, tile
    const downSampleTypes = ["lowquality", "blur", "tile"]
    const inputTypeValue = inputTypeNode?.value as string | undefined;
    const showDownsample = downSampleTypes.includes(modifier) || (inputTypeValue ? downSampleTypes.includes(inputTypeValue.toLowerCase()) : false)
    showWidget(node, "down_sampling_rate", showDownsample)

    // target_blocks, hide by default
    // visible if modifier=shuffle and version is v1 or sdxl
    const targetBlocksTypes = ["ipadapterplus", "ipadapterfull", "ipadapterfaceidplus"]
    const showTargetBlocks = targetBlocksTypes.includes(cnetType) && (modelInfo?.version === "v1" || modelInfo?.version?.startsWith("sdxl"))
    showWidget(node, "target_blocks", showTargetBlocks)
}

interface ControlNetNode extends LGraphNode {
    updateDynamicWidgets: () => void;
    widget_values_keyed?: Record<string, any>;
}

// Using any for the proto object to avoid strict type checks against LGraphNode
// since this is a mixin object
const controlNetProto: any = {
    updateDynamicWidgets(this: ControlNetNode) {
        try {
            updateControlWidgets(this)
        } catch (error) {
            console.error(error)
        }
    },
    onNodeCreated(this: ControlNetNode) {
        this.updateDynamicWidgets()
    },
    onSerialize(this: ControlNetNode, serialised: any) {
        serialised.nodePackVersion = nodePackVersion
        if (this.widgets) {
            serialised.widget_values_keyed = Object.fromEntries(this.widgets.map(w => ([w.name, w.value]))) as Record<string, any>
        }
    },
    onConfigure(this: ControlNetNode, data: any) {
        if (data.widget_values_keyed && this.widgets) {
            for (const [name, value] of Object.entries(data.widget_values_keyed)) {
                const widget = this.widgets.find((w) => w.name === name)
                if (widget) widget.value = value as any
            }
        }

        else if (data.widgets_values && data.widgets_values.length === 8 && this.widgets) {
            const widgetNames = [
                "control_name",
                "control_input_type",
                "control_mode",
                "control_weight",
                "control_start",
                "control_end",
                "global_average_pooling",
                "invert_image"]
            for (let i = 0; i < widgetNames.length; i++) {
                const widget = this.widgets.find((w) => w.name === widgetNames[i])
                if (widget) widget.value = data.widgets_values[i]
            }
        }

        delete this.widget_values_keyed

        this.updateDynamicWidgets()
    },
    onWidgetChanged(this: ControlNetNode, name: string, value: any, old_Value: any, widget: IWidget) {
        if (name === "control_name") {
            const modifier = value?.value?.modifier
            const inputWidget = findWidgetByName(this, "control_input_type")
            if (modifier && inputWidget?.value !== capitalize(modifier)) {
                if (inputWidget) inputWidget.value = capitalize(modifier)
            }
        }

        this.updateDynamicWidgets()
    },
}


const extension: ComfyExtension = {
    name: "controlNetNode",

    beforeRegisterNodeDef(nodeType, nodeData, app) {
        if ((nodeType as any).comfyClass === "DrawThingsControlNet") {
            updateProto(nodeType, controlNetProto)
        }
    }
}

export default extension;

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1)
}
