import { join } from 'path';
import { test } from './fixtures';
import { NodeRef } from './nodeRef';
import { expect } from '@playwright/test';

const comfyUrl = process.env.PLAYWRIGHT_TEST_URL || "";
if (!comfyUrl) throw new Error("PLAYWRIGHT_TEST_URL is not set");

export const workflowFolder = "./tests/workflows";

test("models update with server", async ({ page, comfy }) => {
    // load workflow
    await comfy.openWorkflow(join(workflowFolder, "model_nodes.json"))

    const sampler = await comfy.getNodeRef("DrawThingsSampler", { tag: 'sampler'})
    const lora = await comfy.getNodeRef("DrawThingsLoRA", { tag: 'lora'})
    const cnet = await comfy.getNodeRef("DrawThingsControlNet", { tag: 'cnet'})
    const prompt = await comfy.getNodeRef("DrawThingsPrompt", { tag: 'prompt'})
    const upscaler = await comfy.getNodeRef("DrawThingsUpscaler", { tag: 'upscaler'})
    const refiner = await comfy.getNodeRef("DrawThingsRefiner", { tag: 'refiner'})

    const nodes = [sampler, lora, cnet, prompt, upscaler, refiner]
    const widgets = ["model", "lora", "control_name", "insert_textual_inversion", "upscaler_model", "refiner_model"]

    async function assertAll(assertion: (node: NodeRef, widget: string) => void) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            const widget = widgets[i]
            await assertion(node, widget)
        }
    }

    await assertAll(async (node, widget) => {
        await expect(node, node.tag).toBeDefined()
        await expect(widget, node.tag).toBeDefined()
        await expect(await node?.isWidgetVisible(widget!), node.tag).toBeTruthy()
        await expect((await node?.getWidgetOptions(widget!))?.filter(o => !o.disabled).length, node.tag).toBeGreaterThan(2)
    })
    await expect(await sampler?.getWidgetValue("model")).not.toBe("Not connected")

    // set server to invalid address
    await sampler?.setWidgetValue("port", 1234)
    await page.waitForTimeout(500)

    // assert error model options

    // sampler, lora, cnet, prompt, upscaler, refiner
    // currently only the sampler node model shows "not connected"
    await expect(await sampler?.getWidgetValue("model")).toBe("Not connected")
    await expect((await sampler?.getWidgetOptions("model"))?.length).toBe(2)

    // set server to valid address
    await sampler?.setWidgetValue("port", 7859)
    await page.waitForTimeout(500)

    // assert model options are updated
    // sampler, lora, cnet, prompt, upscaler, refiner
    await expect(await sampler?.getWidgetValue("model")).not.toBe("Not connected")
    await expect((await sampler?.getWidgetOptions("model"))?.length).toBeGreaterThan(2)
})

test("sampler model version", async ({ page, comfy }) => {
    // load workflow
    await comfy.openWorkflow(join(workflowFolder, "model_nodes.json"))

    const sampler = await comfy.getNodeRef("DrawThingsSampler")
    const lora = await comfy.getNodeRef("DrawThingsLoRA")
    const cnet = await comfy.getNodeRef("DrawThingsControlNet")
    const prompt = await comfy.getNodeRef("DrawThingsPrompt")
    const upscaler = await comfy.getNodeRef("DrawThingsUpscaler")
    const refiner = await comfy.getNodeRef("DrawThingsRefiner")

    const nodes = [sampler, lora, cnet, prompt, upscaler, refiner]
    const widgets = ["model", "lora", "control_name", "insert_textual_inversion", "upscaler_model", "refiner_model"]

    async function assertAll(assertion: (node?: NodeRef, widget?: string) => void, excludeSampler?: boolean) {
        for (let i = excludeSampler ? 1 : 0; i < nodes.length; i++) {
            const node = nodes[i]
            const widget = widgets[i]
            await assertion(node, widget)
        }
    }

    await assertAll(async (node, widget) => {
        await expect(node).toBeDefined()
        await expect(widget).toBeDefined()
        await expect(await node?.isWidgetVisible(widget!)).toBeTruthy()
    })

    // select (none selected)
    await sampler?.selectWidgetOption("model", "(None selected)")
    await page.waitForTimeout(500)

    // assert lora, cnet, prompt node models are all enabled
    await assertAll(async (node, widget) => {
        const options = await node?.getWidgetOptions(widget!)
        expect(options?.length).toBeGreaterThan(0)
        await expect(options?.filter(o => !o.disabled).length).toBe(options?.length)
    }, true)

    // select an sd1 model
    // assert non-sd1 models are disabled
    // select an sdxl model
    // assert sd1 models are disabled, and sdxl models are enabled
})

test("single server workflow", async ({ page }) => { })

test("multiple server workflow", async ({ page }) => { })

test("save/restore previous model", async ({ page, comfy }) => {
    // load workflow
    await comfy.openWorkflow(join(workflowFolder, "model_nodes.json"))

    const sampler = await comfy.getNodeRef("DrawThingsSampler")
    const lora = await comfy.getNodeRef("DrawThingsLoRA")
    const cnet = await comfy.getNodeRef("DrawThingsControlNet")
    const upscaler = await comfy.getNodeRef("DrawThingsUpscaler")
    const refiner = await comfy.getNodeRef("DrawThingsRefiner")

    const nodes = [sampler, lora, cnet, upscaler, refiner]
    const widgets = ["model", "lora", "control_name", "upscaler_model", "refiner_model"]

    async function assertAll(assertion: (node?: NodeRef, widget?: string) => void, excludeSampler?: boolean) {
        for (let i = excludeSampler ? 1 : 0; i < nodes.length; i++) {
            const node = nodes[i]
            const widget = widgets[i]
            await assertion(node, widget)
        }
    }

    await assertAll(async (node, widget) => {
        await expect(node).toBeDefined()
        await expect(widget).toBeDefined()
        await expect(await node?.isWidgetVisible(widget!)).toBeTruthy()
        await expect((await node?.getWidgetValue(widget!))?.value).toHaveProperty('file')
    })

    const originalModels = []

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const widget = widgets[i]
        const model = await node?.getWidgetValue(widget!)
        originalModels.push(model?.value?.file)
    }
    console.log(originalModels)

    // set server to invalid address
    await sampler?.setWidgetValue("port", 1234)
    await page.waitForTimeout(500)

    // reload page
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // assert error options oppear on model
    await assertAll(async (node, widget) => {
        const value = await node?.getWidgetValue(widget!)
        expect(value).toBe("Not connected")
    })

    // set server to valid address

    // assert previously select model is selected
})

test("lora model filtering", async ({ page }) => {
    // load workflow (two samplers, one lora, connected to one sampler)

    // change model on connected sampler

    // assert correct version filtered

    // connect lora to second sampler, select different model version

    // assert both versions are filtered
})

test("multiple lora node filtering", async ({ page }) => {
    // load workflow (two samplers with their own lora nodes, sharing prompt node)

    // switch models on one sampler, assert it's connect lora node is filtered correctly

    // assert other lora has not changed

    // which models on the other sampler, assert it's lora node updates correctly

    // assert other lora has not changed
})
