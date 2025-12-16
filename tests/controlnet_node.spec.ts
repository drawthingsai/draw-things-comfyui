import "dotenv/config";
import { expect } from "@playwright/test";
// import { expect } from "./fixtures";
import { getNodeRef, NodeRef } from "./nodeRef";
import { openWorkflow } from "./util";
import { join } from "node:path";
import { test } from "./fixtures";
import fse from "fs-extra";

const comfyUrl = process.env.PLAYWRIGHT_TEST_URL || "";
if (!comfyUrl) throw new Error("PLAYWRIGHT_TEST_URL is not set");

export const workflowFolder = "./tests/workflows";

test("Values are loaded correctly from previous version worklow", async ({
    comfy,
    page,
}) => {
    await comfy.openWorkflow(join(workflowFolder, "inpaint_cnet.json"));

    const node = await comfy.getNodeRef("DrawThingsControlNet");
    expect(node).toBeDefined();

    expect(await node?.getWidgetValue("control_name")).toMatchObject({
        value: {
            file: "controlnet_inpaint_1.x_v1.1_f16.ckpt",
        },
        content: "Inpainting (SD v1.x, ControlNet 1.1) (SD)",
    });

    expect(await node?.getWidgetValue("control_input_type")).toBe("Inpaint");
    expect(await node?.isWidgetVisible("control_input_type")).toBeFalsy();
    // "control_mode": "Balanced",
    expect(await node?.getWidgetValue("control_mode")).toBe("Balanced");
    // "control_weight": 1,
    expect(await node?.getWidgetValue("control_weight")).toBe(1);
    // "control_start": 0,
    expect(await node?.getWidgetValue("control_start")).toBe(0);
    // "control_end": 1,
    expect(await node?.getWidgetValue("control_end")).toBe(1);
    // "global_average_pooling": false,
    expect(await node?.getWidgetValue("global_average_pooling")).toBe(false);
    // "down_sampling_rate": false,
    expect(await node?.getWidgetValue("down_sampling_rate")).toBe(false);
    // "invert_image": false,
    expect(await node?.getWidgetValue("invert_image")).toBe(false);
    // "target_blocks": "All"
    expect(await node?.getWidgetValue("target_blocks")).toBe("All");
});

test("Widget values serialization", async ({ page, comfy }) => {
    // create a new workflow, add a cnet node
    await comfy.createNewWorkflow();
    const node = await comfy.addNode(
        ["DrawThings", "Draw Things Control Net"],
        0,
        0
    );
    await node.centerNode();

    // we need a sampler node for models to appear
    await node.addOutputNode("CONTROL_NET", "Draw Things Sampler");
    await page.waitForTimeout(2000);

    await node.selectWidgetOption(
        "control_name",
        "Inpainting (SD v1.x, ControlNet 1.1) (SD)"
    );
    await node.setWidgetValue("control_weight", 0.8);
    await node.setWidgetValue("control_start", 0.2);
    await node.setWidgetValue("control_end", 0.9);

    // save workflow
    const workflow = await comfy.exportWorkflow();

    // assert correct values
    const cnetNodeJson = workflow.nodes.find(
        (n) => n.type === "DrawThingsControlNet"
    );
    expect(cnetNodeJson).toBeDefined();
    expect(cnetNodeJson).toHaveProperty("nodePackVersion");

    const values = cnetNodeJson.widget_values_keyed;
    expect(values).toBeDefined();
    expect(values.control_weight).toBeCloseTo(0.8, 5);
    expect(values.control_start).toBeCloseTo(0.2, 5);
    expect(values.control_end).toBeCloseTo(0.9, 5);
    expect(values).toHaveProperty("control_name");
    expect(values.control_name).toMatchObject({
        value: {
            file: "controlnet_inpaint_1.x_v1.1_f16.ckpt",
        },
        content: "Inpainting (SD v1.x, ControlNet 1.1) (SD)",
    });
});

test("controlnet dynamic widgets", async ({ page, comfy }) => {
    // create a new workflow, add a cnet node
    await comfy.createNewWorkflow();
    const node = await comfy.addNode(
        ["DrawThings", "Draw Things Control Net"],
        0,
        0
    );
    await node.centerNode();

    // we need a sampler node for models to appear
    await node.addOutputNode("CONTROL_NET", "Draw Things Sampler");
    await page.waitForTimeout(2000);

    expect(
        await node?.isWidgetVisible([
            "control_input_type",
            "global_average_pooling",
            "target_blocks",
            "down_sampling_rate",
        ])
    ).toMatchObject([false, false, false, false]);

    // control_input_type, model: Xinsir Union ProMax (SDXL, ControlNet)
    await node.selectWidgetOption("control_name", "Xinsir Union ProMax");
    expect(await node?.isWidgetVisible("control_input_type")).toBeTruthy();

    // check down sampling rate with union cnet
    await node.selectWidgetOption("control_input_type", "Tile");
    expect(await node?.isWidgetVisible("down_sampling_rate")).toBeTruthy();
    await node.selectWidgetOption("control_input_type", "Inpaint");
    expect(await node?.isWidgetVisible("down_sampling_rate")).toBeFalsy();

    // global_average_pooling, model: Shuffle (SD v1.x, ControlNet 1.1)
    await node.selectWidgetOption(
        "control_name",
        "Shuffle (SD v1.x, ControlNet 1.1)"
    );
    expect(await node?.isWidgetVisible("control_input_type")).toBeFalsy();
    expect(await node?.isWidgetVisible("global_average_pooling")).toBeTruthy();

    // target_blocks, model: IP Adapter Plus (SD v1.x)
    await node.selectWidgetOption("control_name", "IP Adapter Plus (SD v1.x)");
    expect(await node?.isWidgetVisible("global_average_pooling")).toBeFalsy();
    expect(await node?.isWidgetVisible("target_blocks")).toBeTruthy();

    // down_sampling_rate, model: Tile (SD v1.x, ControlNet 1.1)
    await node.selectWidgetOption(
        "control_name",
        "Tile (SD v1.x, ControlNet 1.1)"
    );
    expect(await node?.isWidgetVisible("target_blocks")).toBeFalsy();
    expect(await node?.isWidgetVisible("down_sampling_rate")).toBeTruthy();
});
