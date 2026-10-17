import { join } from "path";
import { test } from "./fixtures";
import { expect } from "@playwright/test";

const models = [
    { name: "Alpha", file: "alpha.ckpt", version: "v1", modifier: "none", text_encoder: "alpha_clip.ckpt", default_scale: 12 },
    { name: "Beta", file: "beta.ckpt", version: "flux1", keyword: "beta" },
];
const catalog = { models, loras: models, controlNets: models, upscalers: models, textualInversions: models };
const disconnectedMenu = [
    { content: "Not connected", disabled: true },
    { content: "Couldn't connect to server. Check server settings and retry", disabled: true },
];

test.beforeEach(async ({ page, comfy }) => {
    await page.route("**/dt_grpc/files_info", (route) => route.fulfill({ json: catalog }));
    await comfy.openWorkflow(join("./tests/workflows", "model_nodes.json"));
    await page.evaluate(async () => {
        await window.app.extensionManager.setting.set("drawthings.bridge_mode.enabled", false);
    });
});

test("model menus are fresh without changing static options or saved selections", async ({ page, comfy }) => {
    const sampler = (await comfy.getNodeRef("DrawThingsSampler"))!;
    const before = await sampler.getWidgetValue("model");
    const options = await sampler.getWidgetOptions("model");
    expect(options).toEqual(["(None selected)", "Alpha (SD)", "Beta (F1)"]);
    expect(await sampler.getWidgetValue("model")).toEqual(before);
    await sampler.selectWidgetOption("model", "Alpha (SD)");
    expect(await sampler.getWidgetValue("model")).toMatchObject({ value: models[0], content: "Alpha (SD)" });
    expect(await sampler.isWidgetVisible("res_dpt_shift")).toBe(false);
    await sampler.selectWidgetOption("model", "Beta (F1)");
    expect(await sampler.isWidgetVisible("res_dpt_shift")).toBe(true);
    const selected = await sampler.getWidgetValue("model");
    await page.route("**/dt_grpc/files_info", (route) => route.fulfill({ status: 503 }));
    expect(await sampler.getWidgetMenuItems("model")).toEqual(disconnectedMenu);
    expect(await sampler.getWidgetValue("model")).toBe("Not connected");
    expect(await page.evaluate(() => window.app.graph.nodes.find((n) => n.type === "DrawThingsSampler").lastSelectedModel.model)).toEqual(selected);
    expect(await page.evaluate(() => window.app.graph.nodes.find((n) => n.type === "DrawThingsSampler").widgets.find((w) => w.name === "model").options.values)).toEqual(["(None selected)"]);
    await page.route("**/dt_grpc/files_info", (route) => route.fulfill({ json: catalog }));
    expect(await sampler.getWidgetOptions("model")).toEqual(["(None selected)", "Alpha (SD)", "Beta (F1)"]);
    expect(await sampler.getWidgetValue("model")).toEqual(selected);
});

test("bridge model catalog is fetched once across repeated menu opens", async ({ page, comfy }) => {
    const requests = { bridgeFiles: 0, combined: 0, serverFiles: 0 };
    await page.route("**/dt_grpc/files_info", (route) => {
        requests.serverFiles++;
        return route.fulfill({ json: catalog });
    });
    await page.route("**/dt_grpc/bridge_models", (route) => {
        requests.bridgeFiles++;
        return route.fulfill({ json: models.map((model) => model.file) });
    });
    await page.route("**/dt_grpc/combined_models", (route) => {
        requests.combined++;
        return route.fulfill({
            json: {
                officialModels: models,
                officialCnets: [],
                officialLoras: [],
                communityModels: [],
                communityCnets: [],
                communityLoras: [],
                communityEmbeddings: [],
                uncuratedModels: [],
            },
        });
    });
    await page.evaluate(async () => {
        await window.app.extensionManager.setting.set("drawthings.bridge_mode.enabled", true);
    });

    const sampler = (await comfy.getNodeRef("DrawThingsSampler"))!;
    expect(await sampler.getWidgetOptions("model")).toEqual(["(None selected)", "Alpha (SD)", "Beta (F1)"]);
    expect(await sampler.getWidgetOptions("model")).toEqual(["(None selected)", "Alpha (SD)", "Beta (F1)"]);
    const upscaler = (await comfy.getNodeRef("DrawThingsUpscaler"))!;
    expect(await upscaler.getWidgetOptions("upscaler_model")).toEqual(["(None selected)", "Alpha (SD)", "Beta (F1)"]);
    expect(requests).toEqual({ bridgeFiles: 1, combined: 1, serverFiles: 3 });

    // A cached bridge catalog must still require a live gRPC connection.
    await sampler.selectWidgetOption("model", "Alpha (SD)");
    const selected = await sampler.getWidgetValue("model");
    await page.route("**/dt_grpc/files_info", (route) => route.fulfill({ status: 503 }));
    expect(await sampler.getWidgetMenuItems("model")).toEqual(disconnectedMenu);
    expect(await sampler.getWidgetValue("model")).toBe("Not connected");
    await page.route("**/dt_grpc/files_info", (route) => route.fulfill({ json: catalog }));
    expect(await sampler.getWidgetOptions("model")).toEqual(["(None selected)", "Alpha (SD)", "Beta (F1)"]);
    expect(await sampler.getWidgetValue("model")).toEqual(selected);
    expect(requests.bridgeFiles).toBe(1);
    expect(requests.combined).toBe(1);
});

test("TLS changes update only the sampler selection and every model menu is inert while offline", async ({ page, comfy }) => {
    const sampler = (await comfy.getNodeRef("DrawThingsSampler"))!;
    await sampler.selectWidgetOption("model", "Alpha (SD)");
    const selected = await sampler.getWidgetValue("model");
    const validTls = await sampler.getWidgetValue("use_tls");
    await page.route("**/dt_grpc/files_info", async (route) => {
        const request = route.request();
        const body = await new Response(request.postData(), {
            headers: { "Content-Type": request.headers()["content-type"] },
        }).formData();
        await route.fulfill(body.get("use_tls") === String(validTls)
            ? { json: catalog } : { status: 503 });
    });
    const otherWidgets = await Promise.all([
        ["DrawThingsLoRA", "lora"],
        ["DrawThingsControlNet", "control_name"],
        ["DrawThingsRefiner", "refiner_model"],
        ["DrawThingsUpscaler", "upscaler_model"],
        ["DrawThingsPrompt", "insert_textual_inversion"],
    ].map(async ([type, widget]) => {
        const node = (await comfy.getNodeRef(type))!;
        return { node, widget, value: await node.getWidgetValue(widget) };
    }));
    const savedModels = () => page.evaluate(() => window.app.graph.nodes.find((n) => n.type === "DrawThingsSampler").lastSelectedModel);

    await sampler.clickWidget("use_tls");
    // Assert the watcher reacts before opening any model menu.
    await expect.poll(() => sampler.getWidgetValue("model")).toBe("Not connected");
    const saved = await savedModels();
    expect(saved.model).toEqual(selected);
    for (const { node, widget, value } of [
        { node: sampler, widget: "model", value: "Not connected" }, ...otherWidgets,
    ]) {
        expect(await node.getWidgetMenuItems(widget)).toEqual(disconnectedMenu);
        await node.clickWidget(widget);
        const menu = page.locator(".litecontextmenu").last();
        await expect(menu.locator(".litemenu-entry")).toHaveText(disconnectedMenu.map((item) => item.content));
        // Dispatch actual pointer clicks even though these entries are disabled.
        for (const item of disconnectedMenu) {
            await menu.getByText(item.content, { exact: true }).click({ force: true });
            expect(await node.getWidgetValue(widget)).toEqual(value);
            expect(await savedModels()).toEqual(saved);
        }
        await page.evaluate(() => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
        await expect(menu).toBeHidden();
    }
    await sampler.clickWidget("use_tls");
    await expect.poll(() => sampler.getWidgetValue("model")).toEqual(selected);
    expect(await sampler.getWidgetOptions("model")).toEqual(["(None selected)", "Alpha (SD)", "Beta (F1)"]);
});

test("downstream model versions are disabled and selecting none removes restriction", async ({ comfy }) => {
    const sampler = (await comfy.getNodeRef("DrawThingsSampler"))!;
    const lora = (await comfy.getNodeRef("DrawThingsLoRA"))!;
    const upscaler = (await comfy.getNodeRef("DrawThingsUpscaler"))!;
    await sampler.selectWidgetOption("model", "Alpha (SD)");
    const items = await lora.getWidgetMenuItems("lora");
    expect(items.find((item) => item.content === "Alpha (SD)")?.disabled).toBe(false);
    expect(items.find((item) => item.content === "Beta (F1)")?.disabled).toBe(true);
    const upscalers = await upscaler.getWidgetMenuItems("upscaler_model");
    expect(upscalers.filter((item) => item.content !== "(None selected)").every((item) => !item.disabled)).toBe(true);
    await sampler.selectWidgetOption("model", "(None selected)");
    expect((await lora.getWidgetMenuItems("lora")).some((item) => item.disabled)).toBe(false);
});
