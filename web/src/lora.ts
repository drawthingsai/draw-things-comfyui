import { nodePackVersion } from "./ComfyUI-DrawThings-gRPC.js"
import { updateProto } from "./util.js"
import { showWidget } from "./widgets.js"
import type { LGraphNode, IWidget } from "@comfyorg/litegraph";
import type { ComfyExtension, ComfyApp } from "@comfyorg/comfyui-frontend-types";

/**
 * so I don't really see an official way to remove widgets other than .splice
 * which seems weird, because then you have to call onRemove() yourself
 * So I'm going to go with "create 8 of them and hide the ones you don't need"
 * If someone needs more than 8 lora, well, they are crazy, and also they can
 * just chain another node
 *
 * we'll use model = null for loras above count
 * distinct from model = "(None selected)"
 *
 * .loraCount prop will 'add' and 'remove' (hide/show) widgets when changed
 * serialize and deserialize it with the node
 *
 * (outdated) and we'll need a callback on each of the lora models so we can add control
 * image inputs if necessary
 * (current) actually I think I'm going to have a separate node for hint images. It's less
 * "comfy" but aligns better with the draw things API and the app
 *
 * the buttons widget is a custom widget type, so it's defined in the python
 * code, event listeners attached by the type handler
 */

export function DtButtonsTypeHandler(node: any, inputName: string, inputData: any, app: ComfyApp) {
    const { container, buttons } = createButtons([
        {
            label: "Show Mode",
            callback: () => {
                node.showMode = !node.showMode;
            },
            dataTestId: "dtgrpc-lora-show-mode",
        },
        {
            label: "Less",
            callback: () => {
                node.loraCount -= 1;
            },
            dataTestId: "dtgrpc-lora-less",
        },
        {
            label: "More",
            callback: () => {
                node.loraCount += 1;
            },
            dataTestId: "dtgrpc-lora-more",
        },
    ]);
    const options = {
        hideOnZoom: false,
        getValue: () => undefined,
        setValue: (value: any) => {},
        getMinHeight: () => 36,
        getMaxHeight: () => 36,
        getHeight: () => 36,
        margin: 4,
    };
    const widget = node.addDOMWidget("buttons", "DT_BUTTONS", container, options);
    widget._buttonElements = buttons;
    widget.value = null;
    return { widget };
}

interface LoraNode extends LGraphNode {
    loraCount: number;
    showMode: boolean;
    _loraCount: number;
    _showMode: boolean;
    updateWidgets: () => void;
    widget_values_keyed?: Record<string, any>;
}

const loraProto: any = {
    onNodeCreated(this: LoraNode, graph: any) {
        this.loraCount = 1;
        this.showMode = false;
    },

    onConfigure(this: LoraNode, serialised: any) {
        if ("loraCount" in serialised) this.loraCount = serialised.loraCount;

        if ("showMode" in serialised) this.showMode = serialised.showMode;

        if (serialised.widget_values_keyed && this.widgets) {
            for (const [name, value] of Object.entries(serialised.widget_values_keyed)) {
                const widget = this.widgets.find((w) => w.name === name);
                if (widget) widget.value = value as any;
            }
        } else if (serialised.widgets_values && serialised.widgets_values.length === 2 && this.widgets) {
            // if keyed values are missing, then values from a previous version
            // have been incorrectly loaded
            // widget_values for all previous version are [ loraModel, weight ]

            // buttons widget, value should be null (None)
            this.widgets[0].value = null as any;

            // model
            const modelWidget = this.widgets.find((w) => w.name === "lora");
            if (modelWidget) modelWidget.value = serialised.widgets_values[0];

            // weight
            const weightWidget = this.widgets.find((w) => w.name === "weight");
            if (weightWidget) weightWidget.value = serialised.widgets_values[1];

            // if loading a previous version, inputs need to be fixed
            const inputs = this.inputs
                .map((input, slot) => ({ slot, input }))
                .filter(({ input }) => input.link !== null);
            const inputNodes = inputs.map(({ input, slot }) => ({ node: this.getInputNode(slot), input, slot }));

            // move lora nodes to correct input slot, disconnect all others
            for (const { node, input, slot } of inputNodes) {
                if (node && node.type === "DrawThingsLoRA" && input.link !== null) {
                    this.disconnectInput(slot)
                    this.graph?.removeLink(input.link)
                    node.connect(0, this, 0)
                }
                else if (input.link !== null) {
                    this.disconnectInput(slot)
                    this.graph?.removeLink(input.link)
                }
            }

            // lastly, remove the image input
            const imageInput = this.inputs.findIndex(input => input.name === 'control_image')
            if (imageInput !== -1) this.removeInput(imageInput)
        }

        delete this.widget_values_keyed;
    },

    onSerialize(this: LoraNode, serialised: any) {
        serialised.loraCount = this._loraCount;
        serialised.showMode = this._showMode;
        serialised.nodePackVersion = nodePackVersion;
        if (this.widgets) {
            serialised.widget_values_keyed = Object.fromEntries(this.widgets.map((w) => [w.name, w.value]));
        }
    },

    loraCount: {
        get(this: LoraNode) {
            return this._loraCount;
        },
        set(this: LoraNode, count: number) {
            if (this._loraCount === count) return;
            this._loraCount = Math.max(0, Math.min(count, 8));
            this.updateWidgets();

            const buttons = (this.widgets?.[0] as any)?._buttonElements;
            if (buttons) {
                buttons[1].disabled = this._loraCount <= 1;
                buttons[2].disabled = this._loraCount >= 8;
            }
        },
        enumerable: true,
    },

    showMode: {
        get(this: LoraNode) {
            return this._showMode;
        },
        set(this: LoraNode, value: boolean) {
            if (this._showMode === value) return;
            this._showMode = value;
            this.updateWidgets();

            /** @type {HTMLButtonElement[]} */
            const buttons = (this.widgets?.[0] as any)?._buttonElements;
            if (buttons) {
                buttons[0].textContent = value ? "Hide Mode" : "Show Mode";
            }
        },
        enumerable: true,
    },

    updateWidgets(this: LoraNode) {
        if (!this.widgets) return;
        for (let i = 0; i < 8; i++) {
            const modelIndex = i * 3 + 1;
            const weightIndex = i * 3 + 2;
            const modeIndex = i * 3 + 3;
            if (i < this.loraCount) {
                showWidget(this, this.widgets[modelIndex].name, true);
                showWidget(this, this.widgets[weightIndex].name, true);
                showWidget(this, this.widgets[modeIndex].name, this.showMode);
                if (!this.widgets[modelIndex].value) {
                    this.widgets[modelIndex].value = "(None selected)";
                }
            } else {
                showWidget(this, this.widgets[modelIndex].name, false);
                showWidget(this, this.widgets[weightIndex].name, false);
                showWidget(this, this.widgets[modeIndex].name, false);

                this.widgets[modelIndex].value = null as any;
            }
        }
    },
};

const extension: ComfyExtension = {
    name: "loraNode",

    beforeRegisterNodeDef(nodeType, nodeData, app) {
        if ((nodeType as any).comfyClass === "DrawThingsLoRA") {
            updateProto(nodeType, loraProto);
        }
    },
};

export default extension;

interface ButtonDef {
    label?: string;
    callback: () => void;
    style?: string;
    classList?: string[];
    dataTestId?: string;
}

function createButtons(buttonsDefs: ButtonDef[]) {
    const container = document.createElement("div");
    container.classList.add("dt-buttons-container");
    const buttons: HTMLButtonElement[] = [];

    for (const buttonDef of buttonsDefs) {
        const button = document.createElement("button");
        buttons.push(button);
        button.classList.add("dt-button");
        if (buttonDef.label) button.innerText = buttonDef.label;
        button.addEventListener("click", () => {
            buttonDef.callback();
        });
        if (buttonDef.style) {
            button.style.cssText = buttonDef.style;
        }
        if (buttonDef.classList) {
            button.classList.add(...buttonDef.classList);
        }
        if (buttonDef.dataTestId) {
            button.setAttribute("data-testid", buttonDef.dataTestId);
        }
        container.appendChild(button);
    }

    return { container, buttons };
}
