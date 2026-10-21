import type { INodeInputSlot, LGraphNode } from '@comfyorg/litegraph'
import modelVersions from "../../src/modelVersions.json";
import { calcShift } from "./configProperties.js"
import { findWidgetByName, getApp, updateProto } from "./util.js"
import { ComfyExtension } from './types';

const basicWidgets = [
    "server",
    "port",
    "use_tls",
    // "model",
    "strength",
    "seed",
    "control_after_generate",
    "width",
    "height",
    "steps",
    "cfg",
    "sampler_name",
    "res_dpt_shift",
    "shift",
    "batch_size",
    "num_frames",
]
const advancedWidgets = [
    "seed_mode",
    "speed_up",
    "guidance_embed",
    "fps",
    "motion_scale",
    "guiding_frame_noise",
    "start_frame_guidance",
    "causal_inference",
    "causal_inference_pad",
    // zero neg
    // sep clip
    "clip_skip",
    "sharpness",
    "mask_blur",
    "mask_blur_outset",
    "preserve_original",
    "separate_clip_l",
    "clip_l_text",
    "separate_open_clip_g",
    "open_clip_g_text",
    "high_res_fix",
    "high_res_fix_start_width",
    "high_res_fix_start_height",
    "high_res_fix_strength",
    "upscaler",
    "image_guidance_scale",
    "tiled_decoding",
    "decoding_tile_width",
    "decoding_tile_height",
    "decoding_tile_overlap",
    "tiled_diffusion",
    "diffusion_tile_width",
    "diffusion_tile_height",
    "diffusion_tile_overlap",
    "tea_cache",
    "tea_cache_start",
    "tea_cache_end",
    "tea_cache_threshold",
    "tea_cache_max_skip_steps",
    "color_calibration",
]

let origProps: Record<string, any> = {}

/**
 * this replace the .pos property on input slots with a getter that returns its
 * normal position only if its associated widget is not hidden. if its widget is
 * hidden, it returns the collapsedPos instead
 * @param {INodeInputSlot?} input
 * @param {LGraphNode} node
 */
function updateInput(input: any, node: any) {
    if (!input || !input.widget || !node || !node.getWidgetFromSlot) return
    if (input._origPos === undefined) {
        input._origPos = input.pos

        const widget = node.getWidgetFromSlot(input)

        Object.defineProperty(input, "pos", {
            get() {
                if (widget.hidden) {
                    return this.collapsedPos
                } else {
                    return input._origPos
                }
            },
            set(value) {
                input._origPos = value
            },
        })
    }
}

/** @param node {LGraphNode} */
export function showWidget(node: LGraphNode, widgetName: string, show = false, suffix = "") {
    const widget = findWidgetByName(node, widgetName)
    if (!widget) return
    if (!origProps[widget.name]) {
        origProps[widget.name] = {
            // origType: widget.type,
            origComputeSize: widget.computeSize,
            origComputedHeight: (widget as any).computedHeight,
        }
    }

    const isVisible = !(widget as any).hidden // !widget.type.startsWith("hidden");
    if (isVisible === show) return

    // widget.type = show ? origProps[widget.name].origType : "hidden" + suffix;
    widget.computeSize = show ? origProps[widget.name].origComputeSize : () => [0, -4]
        ; (widget as any).computedHeight = show ? origProps[widget.name].origComputedHeight : 0
        ; (widget as any).hidden = !show

        ; (widget as any).linkedWidgets?.forEach((w: any) => { showWidget(node, w, show, `:${widget.name}`) })

    const minHeight = node.computeSize()[1]
    if (minHeight > node.size[1]) node.setSize([node.size[0], minHeight])

    if (getApp().extensionManager.setting.get("drawthings.node.keep_shrunk") && minHeight < node.size[1])
        node.setSize([node.size[0], minHeight])

    setTimeout(() => getApp().canvas.setDirty(true, true), 10)
}

function showWidgets(node: LGraphNode, show: boolean, ...widgetNames: string[]) {
    widgetNames.forEach((w) => { showWidget(node, w, show) })
}

function updateSamplerWidgets(node: any) {
    const selectedModel = findWidgetByName(node, "model")?.value
    const version = (selectedModel as any)?.value?.version ?? node?._lastSelectedModel?.model?.value?.version
    const features = modelVersions.find((model) => model.version === version || model.aliases?.includes(version))?.features ?? [];

    const settings = findWidgetByName(node, "settings")?.value
    const isBasic = settings === "Basic" || settings === "All"
    const isAdvanced = settings === "Advanced" || settings === "All"

    showWidgets(node, isBasic, ...basicWidgets)
    showWidgets(node, isAdvanced, ...advancedWidgets)


    if (isBasic) {
        const isTcd = findWidgetByName(node, "sampler_name")?.value?.toString().startsWith("TCD")
        showWidget(node, "stochastic_sampling_gamma", isTcd)

        const resDPTShiftAvailable = features.includes("resolutionDependentShift")
        showWidget(node, "res_dpt_shift", resDPTShiftAvailable)
        const shiftDisabled = resDPTShiftAvailable && findWidgetByName(node, "res_dpt_shift")?.value
        const shiftWidget = findWidgetByName(node, "shift")
        if (shiftWidget) (shiftWidget as any).disabled = shiftDisabled

        const isVideo = features.includes("numFrames")
        showWidget(node, "num_frames", isVideo)

        const zeroCfgAvailable = features.includes("cfgZero")
        const zeroCfgEnabled = zeroCfgAvailable && findWidgetByName(node, "cfg_zero_star")?.value
        showWidget(node, "cfg_zero_star", zeroCfgAvailable)
        showWidget(node, "cfg_zero_star_init_steps", !!zeroCfgEnabled)
    }

    if (isAdvanced) {
        const teaCacheAvailable = features.includes("teaCache")
        const teaCacheEnabled = teaCacheAvailable && findWidgetByName(node, "tea_cache")?.value
        showWidget(node, "tea_cache", teaCacheAvailable)
        showWidgets(
            node,
            !!teaCacheEnabled,
            "tea_cache_start",
            "tea_cache_end",
            "tea_cache_threshold",
            "tea_cache_max_skip_steps"
        )

        const speedUpAvailable = features.includes("guidanceEmbed")
        showWidget(node, "speed_up", speedUpAvailable)
        const speedUpEnabled = findWidgetByName(node, "speed_up")?.value
        showWidget(node, "guidance_embed", speedUpAvailable && !speedUpEnabled)

        const separateClipLAvailable = features.includes("separateClipL")
        showWidget(node, "separate_clip_l", separateClipLAvailable)
        const separateClipLEnabled = separateClipLAvailable && findWidgetByName(node, "separate_clip_l")?.value
        showWidget(node, "clip_l_text", !!separateClipLEnabled)

        const separateOpenClipGAvailable = features.includes("separateOpenClipG")
        showWidget(node, "separate_open_clip_g", separateOpenClipGAvailable)
        const separateOpenClipGEnabled =
            separateOpenClipGAvailable && findWidgetByName(node, "separate_open_clip_g")?.value
        showWidget(node, "open_clip_g_text", !!separateOpenClipGEnabled)

        const isSvd = features.includes("svdOptions")
        showWidgets(node, isSvd, "fps", "motion_scale", "guiding_frame_noise", "start_frame_guidance")

        const causalInferenceAvailable = features.includes("causalInference")
        showWidget(node, "causal_inference", causalInferenceAvailable)
        showWidget(node, "causal_inference_pad", causalInferenceAvailable)

        // high res fix
        const hiResFixEnabled = findWidgetByName(node, "high_res_fix")?.value
        showWidgets(
            node,
            !!hiResFixEnabled,
            "high_res_fix_start_width",
            "high_res_fix_start_height",
            "high_res_fix_strength"
        )

        // tiled decoding
        const tiledDecodingEnabled = findWidgetByName(node, "tiled_decoding")?.value
        showWidgets(node, !!tiledDecodingEnabled, "decoding_tile_width", "decoding_tile_height", "decoding_tile_overlap")

        // tiled diffusion
        const tiledDiffusionEnabled = findWidgetByName(node, "tiled_diffusion")?.value
        showWidgets(
            node,
            !!tiledDiffusionEnabled,
            "diffusion_tile_width",
            "diffusion_tile_height",
            "diffusion_tile_overlap"
        )
    }
}

const extension: ComfyExtension = {
    name: "widgets",

    settings: [
        {
            id: "drawthings.node.keep_shrunk",
            type: "boolean",
            name: "Keep node shrunk when widgets change",
            defaultValue: true,
            category: ["Draw Things", "Nodes", "Keep node shrunk"],
            onChange: (newVal: any, oldVal: any) => {
                if (oldVal === false && newVal === true) {
                    getApp().graph.nodes
                        .filter((n: any) => n.type === "DrawThingsSampler")
                        .forEach((n: any) => {
                            setTimeout(() => n.updateDynamicWidgets(), 10)
                        })
                }
            },
        },
    ],

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if ((nodeType as any).comfyClass === "DrawThingsSampler") {
            updateProto(nodeType, samplerWidgetsProto)
        }
    },
}

export default extension;

const samplerWidgetsProto = {
    updateDynamicWidgets(this: any) {
        updateSamplerWidgets(this)
    },
    onNodeCreated(this: any) {
        this.updateDynamicWidgets()
    },
    onConfigure(this: any, _data: any) {
        this.updateDynamicWidgets()
    },
    onInputAdded(this: any, input: any) {
        if (input.widget) updateInput(input, this)
    },
    onWidgetChanged(this: any, name: string, _value: any, _old_Value: any, _widget: any) {
        this.updateDynamicWidgets()

        if (name === "res_dpt_shift") {
            const version = this.getModelVersion()
            const features = modelVersions.find((model) => model.version === version || model.aliases?.includes(version))?.features ?? []
            const resDPTShiftAvailable = features.includes("resolutionDependentShift")
            const resDptShiftEnabled = resDPTShiftAvailable && findWidgetByName(this, "res_dpt_shift")?.value

            if (resDptShiftEnabled) {
                const height = findWidgetByName(this, "height")?.value
                const width = findWidgetByName(this, "width")?.value
                const shiftWidget = findWidgetByName(this, "shift")
                if (shiftWidget && typeof height === 'number' && typeof width === 'number') {
                    shiftWidget.value = calcShift(height, width)
                }
            }
        }
    },
};
