import type { LGraphNode } from "@comfyorg/litegraph";
import type {
    IBaseWidget,
    IWidgetOptions
} from "@comfyorg/litegraph/dist/types/widgets";
import { findPropertiesByNode, findPropertyJson } from "./configProperties.js";
import { DTSampler } from "./types";

export function importConfig(sampler: DTSampler) {
    {
        navigator.clipboard.readText().then(async (text) => {
            try {
                const config = JSON.parse(text);

                const requiredNodes: string[] = [];

                for (const [k, v] of Object.entries(config)) {
                    const prop = findPropertyJson(k);
                    if (!prop) {
                        continue;
                    }
                    if (prop.node !== sampler.type) {
                        requiredNodes.push(...prop.getRequiredNodes(v, config));
                        continue;
                    }
                    const widget = sampler.widgets?.find(
                        (w) => w.name === prop.python
                    );
                    if (!widget) {
                        continue;
                    }
                    await prop.import(k, v, widget as any, sampler as any, config);
                }
                sampler.coerceWidgetValues();
                sampler.updateDynamicWidgets?.();

                const availableNodes = sampler.getConfigInputNodes();
                const missingNodes: string[] = [];

                if (requiredNodes.includes("DrawThingsUpscaler")) {
                    if (!availableNodes.DrawThingsUpscaler.length)
                        missingNodes.push("DrawThingsUpscaler");
                    else
                        applyConfig(
                            availableNodes.DrawThingsUpscaler[0],
                            config
                        );
                }

                if (requiredNodes.includes("DrawThingsRefiner")) {
                    if (!availableNodes.DrawThingsRefiner.length)
                        missingNodes.push("DrawThingsRefiner");
                    else
                        applyConfig(
                            availableNodes.DrawThingsRefiner[0],
                            config
                        );
                }

                if (requiredNodes.includes("DrawThingsControlNet")) {
                    const cnetNeeded = requiredNodes.filter(
                        (n) => n === "DrawThingsControlNet"
                    ).length;
                    if (cnetNeeded > availableNodes.DrawThingsControlNet.length)
                        missingNodes.push(
                            `${
                                cnetNeeded -
                                availableNodes.DrawThingsControlNet.length
                            } x DrawThingsControlNet`
                        );
                    let controlIndex = 0;
                    for (const cnetNode of availableNodes.DrawThingsControlNet) {
                        applyCnetConfig(
                            cnetNode,
                            config.controls[controlIndex++]
                        );
                    }
                }

                if (requiredNodes.includes("DrawThingsLoRA")) {
                    const loraNeeded = requiredNodes.filter(
                        (n) => n === "DrawThingsLoRA"
                    ).length;
                    if (loraNeeded > availableNodes.DrawThingsLoRA.length)
                        missingNodes.push(
                            `${
                                loraNeeded -
                                availableNodes.DrawThingsLoRA.length
                            } x DrawThingsLoRA`
                        );

                    applyLoraConfig(
                        availableNodes.DrawThingsLoRA as (LGraphNode & {
                            loraCount: number;
                        })[],
                        config.loras
                    );
                }

                if (missingNodes.length) {
                    window.app?.extensionManager.toast.add({
                        severity: "warn",
                        summary: "Draw Things gRPC",
                        detail: [
                            "The Draw Things config has been partially loaded. To load the full config, add the following nodes:\n",
                            ...missingNodes.map((n) => `• ${n}`),
                        ].join("\n"),
                        life: 8000,
                    });
                }
            } catch (e) {
                alert(
                    "Failed to parse Draw Things config from clipboard\n\n" + e
                );
                console.warn(e);
            }
        });
    }
}

function applyConfig(node: LGraphNode, config: Record<string, unknown>) {
    const nodeProps = findPropertiesByNode(node.type);
    for (const nodeProp of nodeProps) {
        const widget = node.widgets?.find((w) => w.name === nodeProp.python);
        if (!widget || !nodeProp.json) continue;
        nodeProp.import(
            nodeProp.json,
            config[nodeProp.json],
            widget as any,
            node,
            config
        );
    }
}

function applyCnetConfig(
    node: LGraphNode,
    controlConfig: Record<string, unknown>
) {
    const widgets =
        node.widgets?.reduce((acc, w) => {
            acc[w.name] = w;
            return acc;
        }, {} as Record<string, IBaseWidget<string | number | boolean | object | undefined, string, IWidgetOptions<unknown>>>) ??
        {};

    if ("file" in controlConfig) {
        const options = widgets.control_name?.options as IWidgetOptions<
            { value: { file: string } }[]
        >;
        const matchingOption = options.values?.find(
            (wv) => wv.value?.file === controlConfig.file
        );
        if (matchingOption) widgets.control_name.value = matchingOption;
    }

    if ("globalAveragePooling" in controlConfig)
        widgets.global_average_pooling.value =
            !!controlConfig.globalAveragePooling;

    if ("weight" in controlConfig && typeof controlConfig.weight === "number")
        widgets.control_weight.value = Math.min(
            Math.max(controlConfig.weight, 0),
            1.5
        );
    else widgets.control_weight.value = 1.0;

    if (
        "guidanceStart" in controlConfig &&
        typeof controlConfig.guidanceStart === "number"
    )
        widgets.control_start.value = Math.min(
            Math.max(controlConfig.guidanceStart, 0),
            1
        );
    else widgets.control_start.value = 0;

    if (
        "guidanceEnd" in controlConfig &&
        typeof controlConfig.guidanceEnd === "number"
    )
        widgets.control_end.value = Math.min(
            Math.max(controlConfig.guidanceEnd, 0),
            1
        );
    else widgets.control_end.value = 1;

    if (
        "downSamplingRate" in controlConfig &&
        typeof controlConfig.downSamplingRate === "number"
    )
        widgets.down_sampling_rate.value = controlConfig.downSamplingRate;
    else widgets.down_sampling_rate.value = 1;

    if (
        "inputOverride" in controlConfig &&
        typeof controlConfig.inputOverride === "string"
    ) {
        const capitalized =
            controlConfig.inputOverride.charAt(0).toUpperCase() +
            controlConfig.inputOverride.slice(1);
        const options = widgets.control_input_type?.options as {
            values: string[];
        };
        if (options?.values?.includes(capitalized))
            widgets.control_input_type.value = capitalized;
        else widgets.control_input_type.value = "Unspecified";
    } else widgets.control_input_type.value = "Unspecified";

    if (
        "controlImportance" in controlConfig &&
        typeof controlConfig.controlImportance === "string"
    ) {
        const capitalized =
            controlConfig.controlImportance.charAt(0).toUpperCase() +
            controlConfig.controlImportance.slice(1);
        const options = widgets.control_mode?.options as {
            values: string[];
        };
        if (options?.values?.includes(capitalized))
            widgets.control_mode.value = capitalized;
        else widgets.control_mode.value = "Balanced";
    } else widgets.control_mode.value = "Balanced";

    if (
        "targetBlocks" in controlConfig &&
        Array.isArray(controlConfig.targetBlocks)
    ) {
        if (controlConfig.targetBlocks.length === 0)
            widgets.target_blocks.value = "All";
        if (controlConfig.targetBlocks.length === 1)
            widgets.target_blocks.value = "Style";
        if (controlConfig.targetBlocks.length > 1)
            widgets.target_blocks.value = "Style and Layout";
    } else widgets.target_blocks.value = "All";
}

async function applyLoraConfig(
    nodes: (LGraphNode & { loraCount: number })[],
    loraConfig: Record<string, unknown>[]
) {
    // any exissting loras will be cleared when loading a config
    // lora count will be set to the number of loras in config, unless the current count is higher
    // (to preserve layouts)
    for (let iNode = 0; iNode < nodes.length; iNode++) {
        const node = nodes[iNode];

        const lastIndex = iNode * 8 + 8;
        if (loraConfig.length > lastIndex) node.loraCount = 8;
        // 13 loras
        // 8 - (16 - 13) = 5
        else node.loraCount = 8 - (lastIndex - loraConfig.length);

        for (let iSlot = 0; iSlot < 8; iSlot++) {
            const lc = loraConfig[iSlot + iNode * 8];
            const { file, weight, mode } = getLoraSlotWidgets(node, iSlot);

            if (!lc || !lc.file) {
                file.value = "(None selected)";
                weight.value = 1.0;
                mode.value = "All";
                continue;
            }

            const loraOptions = file?.options as {
                values: { value: { file: string } }[];
            };
            const matchingOption = loraOptions?.values?.find(
                (wv: { value: { file: string } }) => wv.value?.file === lc.file
            );
            if (matchingOption) file.value = matchingOption;

            if ("weight" in lc && typeof lc.weight === "number")
                weight.value = Math.min(Math.max(lc.weight, -5.0), 5.0);
            else weight.value = 1.0;

            if ("mode" in lc && typeof lc.mode === "string") {
                const capitalized =
                    lc.mode.charAt(0).toUpperCase() + lc.mode.slice(1);
                const options = mode?.options as { values: string[] };
                if (options?.values?.includes(capitalized))
                    mode.value = capitalized;
                else mode.value = "All";
            } else mode.value = "All";
        }
    }
}

function getLoraSlotWidgets(node: LGraphNode, loraIndex: number) {
    const widgets =
        node.widgets?.slice(loraIndex * 3 + 1, loraIndex * 3 + 4) ?? [];
    return {
        file: widgets[0],
        weight: widgets[1],
        mode: widgets[2],
    };
}
