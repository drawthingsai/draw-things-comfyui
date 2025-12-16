import { updateProto } from "./util.js";
import type { LGraphNode, IWidget, LLink, INodeOutputSlot, IContextMenuItem, LGraphCanvas } from "@comfyorg/litegraph";
import type { ComfyExtension } from "@comfyorg/comfyui-frontend-types";

interface PromptNode extends LGraphNode {
    updateOptions: () => void;
}

const promptProto: any = {
    onWidgetChanged(this: PromptNode, name: string, value: any, old_Value: any, widget: IWidget) {
        if (name === "insert_textual_inversion") {
            const keyword = value?.value?.keyword;
            if (!keyword) return;
            const tag = `<${keyword}>`;

            const textWidget = this.widgets?.find((w) => w.name === "prompt");
            const text = textWidget?.value ?? "";

            if (typeof text === 'string' && textWidget) {
                if (text.includes(tag)) {
                    textWidget.value = text.split(tag).join("");
                } else {
                    textWidget.value = `<${keyword}> ${text}`;
                }
            }

            widget.value = "...";
        }
    },

    onConnectionsChange(this: PromptNode, type: number, index: number, isConnected: boolean, link_info: LLink, inputOrOutput: INodeOutputSlot) {
        if (app.extensionManager.setting.get("drawthings.node.color_prompts") === false) return;

        let isPositive = false;
        let isNegative = false;

        for (const linkId of this.outputs?.[0]?.links ?? []) {
            const link = this.graph?.getLink(linkId);
            if (!link) continue;
            const targetId = link.target_id;
            const targetNode = this.graph?.getNodeById(targetId);
            if ((targetNode as any)?.comfyClass === "DrawThingsSampler") {
                const input = targetNode?.inputs?.[link.target_slot];
                if (input?.name === "positive") isPositive = true;
                if (input?.name === "negative") isNegative = true;
            }
        }

        if (isPositive && isNegative) {
            this.color = window.LGraphCanvas.node_colors.purple.color;
            this.bgcolor = window.LGraphCanvas.node_colors.purple.bgcolor;
        } else if (isPositive) {
            this.color = window.LGraphCanvas.node_colors.green.color;
            this.bgcolor = window.LGraphCanvas.node_colors.green.bgcolor;
        } else if (isNegative) {
            this.color = window.LGraphCanvas.node_colors.red.color;
            this.bgcolor = window.LGraphCanvas.node_colors.red.bgcolor;
        } else {
            this.color = undefined;
            this.bgcolor = undefined;
        }
    },

    onNodeCreated(this: PromptNode) {
        const output = this.outputs?.find((output) => output.name == "PROMPT");
        if (output) {
            (output as any).color_on = (output as any).color_off = app.canvas.default_connection_color_byType["CONDITIONING"];
        }

        const promptWidget = this.widgets?.find((w) => w.name === "prompt");
        const promptNode = this;
        if ((promptWidget as any)?.element) {
            (promptWidget as any).element.addEventListener("change", () => {
                promptNode.updateOptions();
            });
        }
    },

    getExtraMenuOptions(this: PromptNode, canvas: LGraphCanvas, options: IContextMenuItem[]) {
        const promptColors = app.extensionManager.setting.get("drawthings.node.color_prompts")
        options.push(
            ...[
                null,
                {
                    content: (promptColors ? "✓ " : "") + "Change colors when connections change",
                    callback: async () => {
                        try {
                            await app.extensionManager.setting.set("drawthings.node.color_prompts", !promptColors);
                        } catch (error) {
                            console.error(`Error changing setting: ${error}`);
                        }
                    },
                },
                null,
            ] as any
        );
    },
};

const extension: ComfyExtension = {
    name: "promptNode",

    beforeRegisterNodeDef(nodeType, nodeData, app) {
        if ((nodeType as any).comfyClass === "DrawThingsPrompt") {
            updateProto(nodeType, promptProto);
        }
    },

    settings: [
        {
            id: "drawthings.node.color_prompts",
            type: "boolean",
            name: "Change prompt node colors when connections change",
            defaultValue: true,
            category: ["DrawThings", "Nodes", "Change prompt"],
            onChange: (newVal: boolean, oldVal: boolean) => {
                if (oldVal === false && newVal === true) {
                    app.graph.nodes
                        .filter((n) => n.type === "DrawThingsPrompt")
                        .forEach((n) => {
                            setTimeout(() => (n as any).onConnectionsChange(), 10)
                        })
                }
            },
        },
    ],
};

export default extension;
