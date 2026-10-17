import "dotenv/config";
import { expect } from "@playwright/test";
import { join } from "node:path";
import { test } from "./fixtures";
import fse from "fs-extra";

const comfyUrl = process.env.PLAYWRIGHT_TEST_URL || "";
if (!comfyUrl) throw new Error("PLAYWRIGHT_TEST_URL is not set");

export const workflowFolder = "./tests/workflows";

for (const format of ["keyed", "legacy positional"]) {
    test(`Values are loaded correctly from previous version workflow (${format})`, async ({ comfy }) => {
        let workflowPath = join(workflowFolder, "inpaint_cnet.json");
        if (format === "legacy positional") {
            const workflow = await fse.readJSON(workflowPath);
            const cnetNodeJson = workflow.nodes.find(n => n.type === "DrawThingsControlNet");
            expect(cnetNodeJson).toBeDefined();
            // Recreate the eight-widget format that predates keyed serialization.
            cnetNodeJson.widgets_values = [
                "control_name", "control_input_type", "control_mode", "control_weight",
                "control_start", "control_end", "global_average_pooling", "invert_image",
            ].map(name => cnetNodeJson.widget_values_keyed[name]);
            delete cnetNodeJson.widget_values_keyed;
            delete cnetNodeJson.nodePackVersion;
            delete cnetNodeJson._lastSelectedModel;
            workflowPath = join(await comfy.getTempDir(), "controlnet-legacy.json");
            await fse.writeJSON(workflowPath, workflow);
        }

        await comfy.openWorkflow(workflowPath);

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
        expect(await node?.getWidgetValue("control_mode")).toBe("Balanced");
        expect(await node?.getWidgetValue("control_weight")).toBe(1);
        expect(await node?.getWidgetValue("control_start")).toBe(0);
        expect(await node?.getWidgetValue("control_end")).toBe(1);
        expect(await node?.getWidgetValue("global_average_pooling")).toBe(false);
        expect(await node?.getWidgetValue("down_sampling_rate")).toBe(false);
        expect(await node?.getWidgetValue("invert_image")).toBe(false);
        expect(await node?.getWidgetValue("target_blocks")).toBe("All");
    });
}

test("Widget values serialization", async ({ page, comfy }) => {
    test.setTimeout(60000);

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
    const expectedModel = {
        value: {
            file: "controlnet_inpaint_1.x_v1.1_f16.ckpt",
            name: "Inpainting (SD v1.x, ControlNet 1.1)",
            version: "v1",
        },
        content: "Inpainting (SD v1.x, ControlNet 1.1) (SD)",
    };
    expect(values.control_name).toMatchObject(expectedModel);
    expect(Object.keys(values.control_name)).not.toContain("toString");
    expect(cnetNodeJson._lastSelectedModel.control_name).toEqual(values.control_name);

    const workflowPath = join(await comfy.getTempDir(), "controlnet-roundtrip.json");
    await fse.writeJSON(workflowPath, workflow);
    await comfy.createNewWorkflow();
    await comfy.openWorkflow(workflowPath);

    const restoredNode = await comfy.getNodeRef("DrawThingsControlNet");
    expect(await restoredNode?.getWidgetValue("control_name")).toMatchObject(expectedModel);
    expect(await restoredNode?.getWidgetValue("control_weight")).toBeCloseTo(0.8, 5);
    expect(await restoredNode?.getWidgetValue("control_start")).toBeCloseTo(0.2, 5);
    expect(await restoredNode?.getWidgetValue("control_end")).toBeCloseTo(0.9, 5);
    expect(await restoredNode?.isWidgetVisible("control_input_type")).toBe(false);
    expect(await page.evaluate(() => {
        const node = app.graph.nodes.find(n => n.type === "DrawThingsControlNet");
        return node.widgets.find(w => w.name === "control_name").value.toString();
    })).toBe(expectedModel.value.name);

    const roundtrip = await comfy.exportWorkflow();
    const restoredJson = roundtrip.nodes.find(n => n.type === "DrawThingsControlNet");
    expect(restoredJson.widget_values_keyed).toEqual(values);
    expect(restoredJson._lastSelectedModel).toEqual(cnetNodeJson._lastSelectedModel);
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
