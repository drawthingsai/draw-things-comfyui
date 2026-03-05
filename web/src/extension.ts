import dtCore, { nodePackVersion } from "./ComfyUI-DrawThings-gRPC.js"
import controlNetNode from "./controlnet.js"
import dtModelNodes from "./dtModelNodes.js"
import dtPrompt from "./dtPromptNode.js"
import loraNode from "./lora.js"
import dtWidgets from "./widgets.js"
import type { ComfyApp, ComfyExtension } from "@comfyorg/comfyui-frontend-types";

// @ts-ignore
import { app } from "../../scripts/app.js";

const modules: ComfyExtension[] = [dtCore, dtPrompt, dtModelNodes, /* dtDynamicInputs, */ dtWidgets, loraNode, controlNetNode]

// different features of the nodepack extension are implemented in different modules
// here we combine them and register a single extension
app.registerExtension({
    name: "DrawThings-gRPC",

    getCustomWidgets(...args: any[]) {
        return dtCore.getCustomWidgets ? dtCore.getCustomWidgets.apply(dtCore, args as any) : {}
    },

    beforeConfigureGraph(...args: any[]) {
        for (const module of modules) {
            try { module.beforeConfigureGraph?.apply(module, args as any) }
            catch (e) {
                console.error(`Error in ${module.name} beforeConfigureGraph:`, e)
            }
        }
    },

    beforeRegisterNodeDef(...args: any[]) {
        for (const module of modules) {
            try { module.beforeRegisterNodeDef?.apply(module, args as any) }
            catch (e) {
                console.error(`Error in ${module.name} beforeConfigureGraph:`, e)
            }
        }
    },

    afterConfigureGraph(...args: any[]) {
        for (const module of modules) {
            try { module.afterConfigureGraph?.apply(module, args as any) }
            catch (e) {
                console.error(`Error in ${module.name} afterConfigureGraph:`, e)
            }
        }
    },

    setup(...args: any[]) {
        for (const module of modules) {
            try { module.setup?.apply(module, args as any) }
            catch (e) {
                console.error(`Error in ${module.name} beforeConfigureGraph:`, e)
            }
        }

        injectStyle()
    },

    settings: modules.flatMap(m => m.settings ?? []),

    aboutPageBadges: [
        {
            label: `DrawThings-gRPC v${nodePackVersion}`,
            url: "https://github.com/drawthingsai/draw-things-comfyui",
            icon: "dt-grpc-about-badge-logo"
        }
    ],
})

const rule = `.dt-grpc-about-badge-logo {
    width: 20px;
    height: 20px;
    background-size: 100% 100%;
    background-color: currentcolor;
    -webkit-mask-image: url(/dt_grpc/logo.svg);
    mask-image: url(/dt_grpc/logo.svg);
}`
const ruleId = "dt-grpc-css-injected"

// this is a hack to get a custom logo on the about page
// idea stolen from rgthree
export function injectStyle() {
    const existing = document.getElementById(ruleId)
    if (existing) {
        return
    }
    const style = document.createElement("style");
    style.id = ruleId
    style.addEventListener("load", (e) => {
        style.sheet.insertRule(rule, style.sheet.cssRules.length);
    })
    document.head.appendChild(style);
}