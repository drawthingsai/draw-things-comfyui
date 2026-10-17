import "dotenv/config";
import { expect } from "@playwright/test";
import { join } from "node:path";
import { test } from './fixtures';
import fse from 'fs-extra'

const comfyUrl = process.env.PLAYWRIGHT_TEST_URL || "";
if (!comfyUrl) throw new Error("PLAYWRIGHT_TEST_URL is not set");

export const workflowFolder = "./tests/workflows";

test("Values are loaded correctly from previous version workflow", async ({ comfy }) => {
    // read json and assert workflow is previous version
    const workflow = await fse.readJSON(join(workflowFolder, "flux_a.json"))
    const loraNodeJson = workflow.nodes.find(n => n.type === "DrawThingsLoRA")
    expect(loraNodeJson).toBeDefined()
    expect(loraNodeJson).not.toHaveProperty('loraCount')
    expect(loraNodeJson).not.toHaveProperty('showMode')
    expect(loraNodeJson).not.toHaveProperty('widget_values_keyed')
    expect(loraNodeJson).not.toHaveProperty('nodePackVersion')
    expect(loraNodeJson.widgets_values).toHaveLength(2)

    // load workflow, check that node has correct values
    await comfy.openWorkflow(join(workflowFolder, "flux_a.json"));
    const node = await comfy.getNodeRef("DrawThingsLoRA")
    expect(node).toBeDefined()

    expect(await node?.getWidgetValue('lora')).toMatchObject({
        value: {
            file: 'flux.1_turbo_alpha_lora_f16.ckpt',
        },
        content: 'FLUX.1 Turbo Alpha (flux1)',
    })
    expect(await node?.getWidgetValue('weight')).toBeCloseTo(1, 5)
});

test('Widget values serialization', async ({ page, comfy }) => {
    test.setTimeout(60000)
    await comfy.updateSetting("drawthings.bridge_mode.enabled", true);
    await comfy.updateSetting("drawthings.bridge_mode.community", true);
    await comfy.updateSetting("drawthings.bridge_mode.uncurated", false);

    // create a new workflow, add a lora node
    await comfy.createNewWorkflow()
    const node = await comfy.addNode(["DrawThings", "Draw Things LoRA"], 0, 0)
    await node.centerNode();

    // hit more twice, turn on show mode, assert 3 lora widgets
    await page.getByTestId('dtgrpc-lora-more').click({ clickCount: 2 })
    await node.centerNode()
    await page.getByTestId('dtgrpc-lora-show-mode').click()
    expect(await node?.isWidgetVisible(["lora", "lora_2", "lora_3"])).toMatchObject([true, true, true])

    // we need a sampler node for models to appear
    await node.addOutputNode('lora_stack', "Draw Things Sampler")
    await page.waitForTimeout(2000)

    // choose 2 models, weights, modes, leave third unset
    await node.selectWidgetOption("lora", "DMD2 SDXL 4-Step")
    await node.setWidgetValue("weight", 0.25)
    await node.selectWidgetOption("lora_2", "Hyper SDXL 4-Step")
    await node.setWidgetValue("weight_2", 0.5)
    await node.selectWidgetOption("mode_2", "Refiner")

    // save workflow
    const workflow = await comfy.exportWorkflow()

    // assert correct values, including showMode and loraCount
    const loraNodeJson = workflow.nodes.find(n => n.type === "DrawThingsLoRA")
    expect(loraNodeJson).toBeDefined()
    expect(loraNodeJson).toHaveProperty('loraCount', 3)
    expect(loraNodeJson).toHaveProperty('showMode', true)
    expect(loraNodeJson).toHaveProperty('widget_values_keyed')
    expect(loraNodeJson).toHaveProperty('nodePackVersion')
    const expectedValues = {
        "lora": {
            "value": {
                "file": "dmd2_sdxl_4_step_lora_f16.ckpt",
                "name": "DMD2 SDXL 4-Step",
                "version": "sdxl_base_v0.9",
            },
            "content": "DMD2 SDXL 4-Step (SDXL)"
        },
        "weight": 0.25,
        "mode": "All",
        "lora_2": {
            "value": {
                "file": "hyper_sdxl_4_step_lora_f16.ckpt",
                "name": "Hyper SDXL 4-Step",
                "version": "sdxl_base_v0.9",
            },
            "content": "Hyper SDXL 4-Step (SDXL)"
        },
        "weight_2": 0.5,
        "mode_2": "Refiner",
        "lora_3": "(None selected)",
        "weight_3": 1,
        "mode_3": "All",
        // Unselected LoRA widgets retain "(None selected)", including hidden slots.
        "lora_4": "(None selected)",
        "weight_4": 1,
        "mode_4": "All",
        "lora_5": "(None selected)",
        "weight_5": 1,
        "mode_5": "All",
        "lora_6": "(None selected)",
        "weight_6": 1,
        "mode_6": "All",
        "lora_7": "(None selected)",
        "weight_7": 1,
        "mode_7": "All",
        "lora_8": "(None selected)",
        "weight_8": 1,
        "mode_8": "All"
    }
    const values = loraNodeJson.widget_values_keyed
    expect(values).toMatchObject(expectedValues)
    for (const name of ["lora", "lora_2"]) {
        expect(Object.keys(values[name])).not.toContain("toString")
        expect(loraNodeJson._lastSelectedModel[name]).toEqual(values[name])
    }
    expect(loraNodeJson._lastSelectedModel).toMatchObject({
        lora_3: "(None selected)",
        lora_4: "(None selected)",
        lora_5: "(None selected)",
        lora_6: "(None selected)",
        lora_7: "(None selected)",
        lora_8: "(None selected)",
    })

    const workflowPath = join(await comfy.getTempDir(), "lora-roundtrip.json")
    await fse.writeJSON(workflowPath, workflow)
    await comfy.createNewWorkflow()
    await comfy.openWorkflow(workflowPath)

    const restoredNode = await comfy.getNodeRef("DrawThingsLoRA")
    expect(await restoredNode?.getWidgetValue("lora")).toMatchObject(expectedValues.lora)
    expect(await restoredNode?.getWidgetValue("lora_2")).toMatchObject(expectedValues.lora_2)
    expect(await restoredNode?.getWidgetValue("weight")).toBeCloseTo(0.25, 5)
    expect(await restoredNode?.getWidgetValue("weight_2")).toBeCloseTo(0.5, 5)
    expect(await restoredNode?.getWidgetValue("mode_2")).toBe("Refiner")
    expect(await restoredNode?.getWidgetValue("lora_3")).toBe("(None selected)")
    expect(await restoredNode?.getWidgetValue("lora_4")).toBe("(None selected)")
    expect(await restoredNode?.isWidgetVisible(["lora", "lora_2", "lora_3", "lora_4"])).toEqual([true, true, true, false])
    expect(await restoredNode?.isWidgetVisible(["mode", "mode_2", "mode_3", "mode_4"])).toEqual([true, true, true, false])
    await expect(page.getByTestId("dtgrpc-lora-show-mode")).toHaveText("Hide Mode")
    expect(await page.evaluate(() => {
        const node = app.graph.nodes.find(n => n.type === "DrawThingsLoRA")
        return ["lora", "lora_2"].map(name => node.widgets.find(w => w.name === name).value.toString())
    })).toEqual([expectedValues.lora.value.name, expectedValues.lora_2.value.name])

    const roundtrip = await comfy.exportWorkflow()
    const restoredJson = roundtrip.nodes.find(n => n.type === "DrawThingsLoRA")
    expect(restoredJson.loraCount).toBe(3)
    expect(restoredJson.showMode).toBe(true)
    expect(restoredJson.widget_values_keyed).toEqual(values)
    expect(restoredJson._lastSelectedModel).toEqual(loraNodeJson._lastSelectedModel)
});

// - UI tests
test('"Show mode" toggles visibility of "mode" widgets', async ({ page, comfy }) => {
    await comfy.openWorkflow(join(workflowFolder, "lora_node.json"));

    // find the lora node and assert mode widgets are not visible
    const node = await comfy.getNodeRef("DrawThingsLoRA")
    expect(node).toBeDefined()
    expect(await node?.isWidgetVisible(["mode", "mode_2", "mode_3", "mode_4"])).toMatchObject([false, false, false, false])

    // find the mode button, assert visibility and text
    const button = await page.getByTestId('dtgrpc-lora-show-mode')
    await expect(button).toBeVisible()
    await expect(button).toHaveText("Show Mode")

    // click the button, assert the text changes
    await button.click()
    await expect(button).toBeVisible()
    await expect(button).toHaveText("Hide Mode")

    // assert widgets appear
    expect(await node?.isWidgetVisible(["mode", "mode_2", "mode_3", "mode_4"])).toMatchObject([true, true, true, true])

    // click button again, assert text reverts and widgets are hidden
    await button.click()
    await expect(button).toBeVisible()
    await expect(button).toHaveText("Show Mode")
    expect(await node?.isWidgetVisible(["mode", "mode_2", "mode_3", "mode_4"])).toMatchObject([false, false, false, false])
});

test('"More" button', async ({ page, comfy }) => {
    await comfy.openWorkflow(join(workflowFolder, "lora_node.json"));

    // find the lora node and assert mode widgets are not visible
    const node = await comfy.getNodeRef("DrawThingsLoRA")
    expect(node).toBeDefined()

    // assert loaded workflow has loraCount=4
    let visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("lora")).length).toBe(4)
    expect(visibleWidgets.filter(w => w.startsWith("weight")).length).toBe(4)
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(0)

    // hit show mode, and assert 4 mode widgets appear
    await page.getByTestId('dtgrpc-lora-show-mode').click()
    visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(4)

    // find the "More" button, assert it is enabled
    const button = await page.getByTestId('dtgrpc-lora-more')
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()

    // press it 3 times, assert 7 loras listed
    await button.click({ clickCount: 3 })
    visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("lora")).length).toBe(7)
    expect(visibleWidgets.filter(w => w.startsWith("weight")).length).toBe(7)
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(7)

    // assert button is enabled, then click again
    await expect(button).toBeEnabled()
    await button.click()

    // assert button is disabled, and 8 lora widgets
    await expect(button).toBeDisabled()
    visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("lora")).length).toBe(8)
    expect(visibleWidgets.filter(w => w.startsWith("weight")).length).toBe(8)
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(8)

    // turn off show mode, assert change
    await page.getByTestId('dtgrpc-lora-show-mode').click()
    visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("lora")).length).toBe(8)
    expect(visibleWidgets.filter(w => w.startsWith("weight")).length).toBe(8)
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(0)
});

test('"Less" button', async ({ page, comfy }) => {
    await comfy.openWorkflow(join(workflowFolder, "lora_node.json"));

    // find the lora node and assert mode widgets are not visible
    const node = await comfy.getNodeRef("DrawThingsLoRA")
    expect(node).toBeDefined()

    // assert loaded workflow has loraCount=4
    let visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("lora")).length).toBe(4)
    expect(visibleWidgets.filter(w => w.startsWith("weight")).length).toBe(4)
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(0)

    // hit show mode, and assert 4 mode widgets appear
    await page.getByTestId('dtgrpc-lora-show-mode').click()
    visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(4)

    // find the "Less" button, assert it is enabled
    const button = await page.getByTestId('dtgrpc-lora-less')
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()

    // press it 2 times, assert 2 loras listed
    await button.click({ clickCount: 2 })
    visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("lora")).length).toBe(2)
    expect(visibleWidgets.filter(w => w.startsWith("weight")).length).toBe(2)
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(2)

    // assert button is enabled, then click again
    await expect(button).toBeEnabled()
    await button.click()

    // assert button is disabled, and 1 lora widgets
    await expect(button).toBeDisabled()
    visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("lora")).length).toBe(1)
    expect(visibleWidgets.filter(w => w.startsWith("weight")).length).toBe(1)
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(1)

    // turn off show mode, assert change
    await page.getByTestId('dtgrpc-lora-show-mode').click()
    visibleWidgets = await node?.getVisibleWidgets() ?? []
    expect(visibleWidgets.filter(w => w.startsWith("lora")).length).toBe(1)
    expect(visibleWidgets.filter(w => w.startsWith("weight")).length).toBe(1)
    expect(visibleWidgets.filter(w => w.startsWith("mode")).length).toBe(0)
});

test("inputs are fixed when loading old workflow", async ({ page, comfy }) => {
    await comfy.openWorkflow(join(workflowFolder, "lora_inputs.json"));

    const result = await page.evaluate(() => {
        const loraNodes = app.graph.nodes.filter(n => n.type === "DrawThingsLoRA")
        let loraStackConnected = false
        for (const lora of loraNodes) {
            // find connected inputs
            for (let i = 0; i < lora.inputs.length; i++) {
                // make sure the image input slot has been removed
                if (lora.inputs[i].name === "control_image")
                    throw new Error("image input slot was not removed")

                if (lora.inputs[i].link === null) continue

                const inputNode = lora.getInputNode(i)

                // if anything but a lora node is connect, throw
                if (inputNode.type !== "DrawThingsLoRA")
                    throw new Error("non lora node was not disconnected")

                // the connect node must be lora, make sure it's on the correct slot
                if (lora.inputs[i].name !== "lora_stack")
                    throw new Error("lora_stack was not disconnected from wrong slot")

                loraStackConnected = true
            }
        }
        if (!loraStackConnected)
            throw new Error("lora_stack was not connected")

        return true
    })

    expect(result).toBeTruthy()
})
