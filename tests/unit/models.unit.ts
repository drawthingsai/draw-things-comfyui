import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { test } from "node:test";

const settings = new Map<string, boolean>();
const graph: any = { nodes: [], getNodeById(id: number) { return this.nodes.find((n: any) => n.id === id); } };
const app: any = { graph, canvas: { graph_mouse: [0, 0] }, extensionManager: { setting: { get: (key: string) => settings.get(key) } } };
let fetchApi: (path: string, options?: any) => Promise<any>;
(globalThis as any).window = { comfyAPI: { app: { app }, api: { api: { fetchApi: (...args: any[]) => fetchApi(args[0], args[1]) } } } };
const { ComboWidget } = await import("@comfyorg/litegraph");
const { modelService, getMenuItem, restoreModelLabel, findServerNodes, DtModelTypeHandler, updateServerConnection } = await import("../../web/src/models");
const model = (name: string, version?: string, extra = {}) => ({ name, file: `${name}.ckpt`, version, ...extra });
const catalog = (models: any[]) => ({ models, loras: models, controlNets: models, textualInversions: models, upscalers: models });
const response = (value: any) => ({ ok: true, json: async () => value });
function sampler(id = 1, port = 7859, version: string | undefined = "v1"): any {
    return { id, graph, isDtServerNode: true, getServer: () => ({ server: "localhost", port, useTls: false }), getModelVersion: () => version };
}
function reset(nodes: any[]) { graph.nodes = nodes; settings.clear(); }

test("menu query sorts copies and unions downstream versions without dropping metadata", async () => {
    const a = sampler(), b = sampler(2, 7860, "flux1");
    const node: any = { id: 3, graph, outputs: [{ links: [1, 2] }] };
    graph.getLink = (id: number) => ({ target_id: id, target_slot: 0 });
    reset([a, b, node]);
    const models = [model("Zulu", "v2"), model("Beta", "flux1"), model("Alpha", "v1", { keyword: "alpha", modifier: "depth", custom: [1, 2] }), model("Free")];
    fetchApi = async () => response(catalog(models));
    const items = await modelService.getMenuItems(node, "loras");
    assert.deepEqual(items.map((m) => m.value.name), ["Alpha", "Beta", "Free", "Zulu"]);
    assert.deepEqual(items.map((m) => m.disabled), [false, false, false, true]);
    assert.deepEqual(items[0].value.custom, [1, 2]);
    assert.deepEqual(models.map((m) => m.name), ["Zulu", "Beta", "Alpha", "Free"]);
    const restored = restoreModelLabel(JSON.parse(JSON.stringify(items[0])));
    assert.equal(String(restored), "Alpha");
    assert.equal(restored.content, "Alpha (SD)");
    assert.deepEqual(restored.value, models[2]);
    const upscalers = await modelService.getMenuItems(node, "upscalers");
    assert.deepEqual(upscalers.map((m) => m.value.name), ["Alpha", "Beta", "Free", "Zulu"]);
    assert.equal(upscalers.some((m) => m.disabled), false);
});

test("coalesces local requests, rejects failures, retains success and retries next query", async () => {
    const node = sampler(1, 7861); reset([node]);
    let requests = 0;
    fetchApi = async () => { requests++; await new Promise((r) => setTimeout(r, 5)); return response(catalog([model("Saved")])); };
    await Promise.all([modelService.getMenuItems(node, "models"), modelService.getMenuItems(node, "loras")]);
    assert.equal(requests, 1);
    fetchApi = async () => { throw new Error("offline"); };
    await assert.rejects(modelService.getMenuItems(node, "models"), /Couldn't connect/);
    assert.equal(modelService.getCachedModels(node)[0].models[0].name, "Saved");
    fetchApi = async () => response(catalog([model("Retried")]));
    assert.equal((await modelService.getMenuItems(node, "models"))[0].value.name, "Retried");
});

test("disconnected nodes use only a single unique server and have no version restriction", async () => {
    const node: any = { id: 3, graph, outputs: [] };
    reset([sampler(), node]);
    fetchApi = async () => response(catalog([model("Other", "v2")]));
    assert.equal((await modelService.getMenuItems(node, "loras"))[0].disabled, false);
    graph.nodes.push(sampler(2, 7860));
    await assert.rejects(modelService.getMenuItems(node, "loras"), /Couldn't connect/);
});

test("traversal follows all outputs and protects cycles and shared paths", () => {
    const server = sampler();
    const first: any = { id: 2, graph, outputs: [{ links: [2] }, { links: [3] }] };
    const second: any = { id: 3, graph, outputs: [{ links: [1, 3] }] };
    reset([server, first, second]);
    const links: any = { 1: { target_id: 2 }, 2: { target_id: 3 }, 3: { target_id: 1 } };
    graph.getLink = (id: number) => links[id];
    assert.deepEqual(findServerNodes(first), [server]);
});

test("offline imports preserve unknown filenames for every model widget and retry catalogs", async () => {
    const { node, widget } = widgetNode();
    node.getServer = () => ({ server: "offline", port: 7999, useTls: true });
    const requests: string[] = [];
    fetchApi = async (path) => { requests.push(path); throw new Error("offline"); };
    for (const [name, type] of [
        ["model", "models"], ["refiner_model", "models"], ["upscaler_model", "upscalers"],
        ["lora", "loras"], ["control_name", "controlNets"], ["insert_textual_inversion", "textualInversions"],
    ]) {
        widget.name = name; widget.options.modelType = type;
        await modelService.selectByFile(node, widget, "unknown.ckpt");
        assert.deepEqual(JSON.parse(JSON.stringify(widget.value)), {
            value: { file: "unknown.ckpt" }, content: "unknown.ckpt",
        });
        assert.equal(String(widget.value), "unknown.ckpt");
        assert.equal(node.saved[0].value.file, "unknown.ckpt");
    }
    assert.equal(requests.filter((path) => path.endsWith("combined_models")).length, 6);
    assert.equal(requests.some((path) => path.endsWith("bridge_models")), false);
});

test("bridge checks the server, coalesces and respects community and uncurated settings", async () => {
    const node = sampler(); reset([node]);
    settings.set("drawthings.bridge_mode.enabled", true);
    let requests = 0;
    const official = model("Official"), community = model("Community"), uncurated = model("Uncurated");
    fetchApi = async (path) => {
        requests++;
        if (path.endsWith("files_info")) return response(catalog([]));
        await new Promise((r) => setTimeout(r, 5));
        if (path.endsWith("bridge_models")) return response([official.file, community.file, uncurated.file]);
        return response({ officialModels: [official, model("Not on bridge", "flux1", { custom: 42 })], communityModels: [community], uncuratedModels: [uncurated], officialCnets: [official], communityCnets: [community], officialLoras: [official], communityLoras: [community], communityEmbeddings: [community] });
    };
    const items = await Promise.all([modelService.getMenuItems(node, "models"), modelService.getMenuItems(node, "loras")]);
    assert.equal(requests, 3);
    assert.deepEqual(items[0].map((m) => m.value.name), ["Official"]);
    settings.set("drawthings.bridge_mode.community", true);
    settings.set("drawthings.bridge_mode.uncurated", true);
    assert.deepEqual((await modelService.getMenuItems(node, "models")).map((m) => m.value.name), ["Community", "Official", "Uncurated"]);
    assert.equal((await modelService.getMenuItems(node, "textualInversions"))[0].value.name, "Community");
    fetchApi = async (path) => {
        if (path.endsWith("files_info")) return response(catalog([]));
        throw new Error("bridge offline");
    };
    assert.deepEqual((await modelService.getMenuItems(node, "models")).map((m) => m.value.name), ["Community", "Official", "Uncurated"]);
    assert.equal(requests, 5);
    fetchApi = async () => { throw new Error("server offline"); };
    await assert.rejects(modelService.getMenuItems(node, "models"), /Couldn't connect/);
});

test("imports search every metadata source regardless of bridge visibility or availability", async () => {
    const { node, widget } = widgetNode();
    node.getServer = () => ({ server: "empty", port: 7998, useTls: true });
    fetchApi = async (path) => {
        assert.equal(path, "/dt_grpc/files_info");
        return response(catalog([]));
    };
    for (const bridge of [false, true]) {
        settings.set("drawthings.bridge_mode.enabled", bridge);
        settings.set("drawthings.bridge_mode.community", false);
        settings.set("drawthings.bridge_mode.uncurated", false);
        for (const type of ["models", "loras", "controlNets", "textualInversions"]) {
            widget.options.modelType = type;
            for (const name of type === "models" ? ["Official", "Community", "Uncurated", "Not on bridge"]
                : type === "textualInversions" ? ["Community"] : ["Official", "Community"]) {
                await modelService.selectByFile(node, widget, `${name}.ckpt`);
                assert.equal(widget.value.value.name, name);
                assert.equal(widget.value.value.file, `${name}.ckpt`);
                if (name === "Not on bridge") {
                    assert.equal(widget.value.value.custom, 42);
                    assert.equal(widget.value.content, "Not on bridge (F1)");
                }
            }
        }
        widget.options.modelType = "models";
        await modelService.selectByFile(node, widget, "absent-everywhere.ckpt");
        assert.deepEqual(widget.value.value, { file: "absent-everywhere.ckpt" });
    }
});

test("imports use local metadata for every widget even in bridge mode", async () => {
    const { node, widget } = widgetNode();
    node.getServer = () => ({ server: "local-import", port: 7997, useTls: true });
    settings.set("drawthings.bridge_mode.enabled", true);
    const local = model("Community", "v2", { localMetadata: 123 });
    let requests = 0;
    fetchApi = async (path) => {
        assert.equal(path, "/dt_grpc/files_info"); requests++;
        return response(catalog([local]));
    };
    for (const type of ["models", "upscalers", "loras", "controlNets", "textualInversions"]) {
        widget.options.modelType = type;
        await modelService.selectByFile(node, widget, local.file);
        assert.deepEqual(widget.value.value, local);
    }
    assert.equal(requests, 1);
});

test("disconnected imports resolve metadata and preserve filenames without a server", async () => {
    const { node, widget } = widgetNode();
    node.isDtServerNode = false;
    fetchApi = async () => { throw new Error("offline"); };
    await modelService.selectByFile(node, widget, "Uncurated.ckpt");
    assert.equal(widget.value.value.name, "Uncurated");
    await modelService.selectByFile(node, widget, "disconnected.ckpt");
    assert.deepEqual(widget.value.value, { file: "disconnected.ckpt" });
    await modelService.selectByFile(node, widget, null);
    assert.equal(widget.value, "(None selected)");
});

test("upscalers always come from the connected server when bridge mode is enabled", async () => {
    const node = sampler(1, 7862); reset([node]);
    settings.set("drawthings.bridge_mode.enabled", true);
    const requests: string[] = [];
    fetchApi = async (path) => {
        requests.push(path);
        return response(catalog([model("Server upscaler", "v2")]));
    };

    const items = await modelService.getMenuItems(node, "upscalers");
    assert.deepEqual(items.map((item) => item.value.name), ["Server upscaler"]);
    assert.equal(items[0].disabled, false);
    assert.deepEqual(requests, ["/dt_grpc/files_info"]);
});

const menus: any[] = [];
class Menu {
    root = { isConnected: true };
    constructor(public items: any[], public options: any) { menus.push(this); }
    close() { this.root.isConnected = false; }
}
(window as any).LiteGraph = { ContextMenu: Menu };
function widgetNode(prompt = false) {
    const node: any = sampler(1, prompt ? 7871 : 7870);
    node.outputs = [];
    node.pos = [100, 100]; node.size = [300, 200];
    node.widgets = prompt ? [{ name: "prompt", value: "<alpha> original" }] : [];
    node.saveSelectedModels = () => { node.saved = node.widgets.map((w: any) => w.value); };
    node.addWidget = (_type: string, name: string, value: any, callback: any, options: any) => {
        const widget = new ComboWidget({ type: "combo", name, value, callback, options, y: 0 }, node);
        node.widgets.push(widget); return widget;
    };
    reset([node]);
    const widget = DtModelTypeHandler(node, prompt ? "insert_textual_inversion" : "model", ["DT_MODEL", { model_type: prompt ? "textualInversions" : "models" }], app).widget;
    return { node, widget: widget as any };
}

test("click menus leave static options and selected wrapper unchanged until setValue notifies", async () => {
    const { node, widget } = widgetNode();
    const full = model("Alpha", "v1", { modifier: "inpaint", default_scale: 12, text_encoder: "clip.ckpt" });
    const original = widget.value = getMenuItem(full);
    const options = widget.options.values;
    let notified = 0; node.onWidgetChanged = () => notified++;
    let dynamicUpdates = 0; node.updateDynamicWidgets = () => dynamicUpdates++;
    fetchApi = async () => response(catalog([full]));
    await widget.onClick({ e: {}, node, canvas: { ds: { scale: 1 } } });
    assert.equal(widget.value, original);
    assert.equal(widget.options.values, options);
    assert.equal(widget.value, original);
    const menu = menus.at(-1);
    menu.options.callback(menu.items[1]);
    assert.equal(notified, 1);
    assert.equal(dynamicUpdates, 1);
    assert.deepEqual(widget.value.value, full);
    assert.equal(widget.value.content, "Alpha (SD)");
    assert.equal(String(widget.value), "Alpha");
    assert.equal(node.saved[0].value.text_encoder, "clip.ckpt");
});

test("removed nodes and dismissed loading menus ignore delayed responses", async () => {
    const { node, widget } = widgetNode();
    let finish: (response: any) => void;
    fetchApi = () => new Promise((resolve) => { finish = resolve; });
    const count = menus.length;
    const click = widget.onClick({ e: {}, node, canvas: { ds: { scale: 1 } } });
    menus.at(-1).close();
    finish!(response(catalog([model("Delayed")])));
    await click;
    assert.equal(menus.length, count + 1);
    const next = widget.onClick({ e: {}, node, canvas: { ds: { scale: 1 } } });
    graph.nodes = [];
    finish!(response(catalog([model("Delayed")])));
    await next;
    assert.equal(menus.length, count + 2);
    assert.equal(widget.value, "(None selected)");
});

test("prompt menus inspect current tags, disable mismatches even if selected, and toggle via wrapper", async () => {
    const { default: promptExtension } = await import("../../web/src/dtPromptNode");
    class Prompt {}
    (Prompt as any).comfyClass = "DrawThingsPrompt";
    (promptExtension.beforeRegisterNodeDef as any)(Prompt, {}, app);
    const { node, widget } = widgetNode(true);
    node.isDtServerNode = false;
    const server = sampler(2, 7871); graph.nodes.push(server);
    node.outputs = [{ links: [1] }]; graph.getLink = () => ({ target_id: 2 });
    node.onWidgetChanged = (Prompt.prototype as any).onWidgetChanged;
    fetchApi = async () => response(catalog([model("Alpha", "v1", { keyword: "alpha" }), model("Other", "v2", { keyword: "other" })]));
    node.widgets[0].value = "<alpha> <other> original";
    await widget.onClick({ e: {}, node, canvas: { ds: { scale: 1 } } });
    let menu = menus.at(-1);
    assert.equal(menu.items[1].content, "✓ Alpha (v1)");
    assert.equal(menu.items[2].disabled, true);
    menu.options.callback(menu.items[1]);
    assert.equal(node.widgets[0].value, " <other> original");
    assert.equal(widget.value, "...");
    await widget.onClick({ e: {}, node, canvas: { ds: { scale: 1 } } });
    menu = menus.at(-1); assert.equal(menu.items[1].content, "Alpha (v1)");
    menu.options.callback(menu.items[1]);
    assert.equal(node.widgets[0].value, "<alpha>  <other> original");
});

test("config model import awaits lookup and sends complete wrapper through selection notifications", async () => {
    const { findPropertyJson } = await import("../../web/src/configProperties");
    const { node, widget } = widgetNode();
    let notified = false; node.onWidgetChanged = () => { notified = true; };
    const full = model("Imported", "flux1", { modifier: "depth", keyword: "imported", custom: { keep: true } });
    fetchApi = async () => { await new Promise((r) => setTimeout(r, 5)); return response(catalog([full])); };
    await findPropertyJson("model")!.import("model", full.file, widget, node, {});
    assert.equal(notified, true);
    assert.deepEqual(widget.value.value, full);
    assert.deepEqual(widget.options.values, ["(None selected)"]);
});

test("configuration hydrates saved labels without catalogs and preserves absent model metadata", async () => {
    const { default: extension } = await import("../../web/src/dtModelNodes");
    class Sampler {}
    (Sampler as any).comfyClass = "DrawThingsSampler";
    (extension.beforeRegisterNodeDef as any)(Sampler, {}, app);
    const node: any = new Sampler(); node.comfyClass = "DrawThingsSampler";
    const original = getMenuItem(model("Offline", "v1", { text_encoder: "unlisted.ckpt" }));
    node.widgets = [{ name: "model", value: JSON.parse(JSON.stringify(original)), options: { modelType: "models", values: ["(None selected)"] } }];
    node.onConfigure({});
    assert.equal(String(node.widgets[0].value), "Offline");
    assert.equal(node.widgets[0].value.value.text_encoder, "unlisted.ckpt");
    node.widgets[0].value = "Not connected";
    node.onConfigure({ _lastSelectedModel: { model: JSON.parse(JSON.stringify(original)) } });
    assert.equal(node.widgets[0].value.content, "Offline (SD)");
    assert.equal(String(node.widgets[0].value), "Offline");
});

test("multi-server union remains available when one downstream server is offline", async () => {
    const a = sampler(1, 7880), b = sampler(2, 7881, "flux1");
    const node: any = { id: 3, graph, outputs: [{ links: [1, 2] }] };
    reset([a, b, node]);
    graph.getLink = (id: number) => ({ target_id: id });
    fetchApi = async (_path, options) => {
        if (options.body.get("port") === "7881") throw new Error("offline");
        return response(catalog([model("Available", "v1")]));
    };
    assert.equal((await modelService.getMenuItems(node, "loras"))[0].value.name, "Available");
});

test("traversal enters and exits installed LiteGraph subgraph slots without selecting unrelated outputs", () => {
    const server = sampler(1, 7890);
    const inner: any = { nodes: [], outputNode: { id: -20 } };
    const source: any = { id: 4, graph, outputs: [{ links: [1] }] };
    const middle: any = { id: 5, graph: inner, outputs: [{ links: [3] }] };
    const container: any = { id: 3, graph, subgraph: inner, outputs: [{ links: [4] }] };
    inner.rootGraph = graph;
    inner.inputNode = { slots: [{ getLinks: () => [{ id: 2 }] }] };
    inner.nodes = [middle];
    inner.getNodeById = (id: number) => inner.nodes.find((n: any) => n.id === id);
    const links: any = { 1: { target_id: 3, target_slot: 0 }, 2: { target_id: 5, target_slot: 0 }, 3: { target_id: -20, target_slot: 0 }, 4: { target_id: 1, target_slot: 0 } };
    graph.getLink = inner.getLink = (id: number) => links[id];
    reset([server, source, container]);
    assert.deepEqual(findServerNodes(source), [server]);
    assert.deepEqual(findServerNodes(middle), [server]);
});

test("clipboard import awaits sampler, refiner, upscaler, ControlNet and LoRA model selections", async () => {
    const { importConfig } = await import("../../web/src/configImport");
    const { node: server, widget: main } = widgetNode();
    server.type = "DrawThingsSampler";
    const children: any[] = [];
    function child(type: string) {
        const node: any = { ...server, id: 20 + children.length, type, isDtServerNode: false, widgets: [], outputs: [], notifications: 0 };
        children.push(node); graph.nodes.push(node); return node;
    }
    function add(node: any, name: string, modelType?: string) {
        const widget: any = { name, value: modelType ? "(None selected)" : 0, options: modelType ? { modelType, values: ["(None selected)"] } : {},
            setValue(value: any) { this.value = value; node.notifications = (node.notifications ?? 0) + 1; },
        };
        node.widgets.push(widget); return widget;
    }
    const refiner = child("DrawThingsRefiner"), upscaler = child("DrawThingsUpscaler"), cnet = child("DrawThingsControlNet"), lora = child("DrawThingsLoRA");
    const refinerModel = add(refiner, "refiner_model", "models");
    const upscalerModel = add(upscaler, "upscaler_model", "upscalers");
    const control = add(cnet, "control_name", "controlNets");
    for (const name of ["global_average_pooling", "control_weight", "control_start", "control_end", "down_sampling_rate", "control_input_type", "control_mode", "target_blocks"]) add(cnet, name);
    add(lora, "header");
    for (let i = 0; i < 8; i++) { add(lora, `lora${i}`, "loras"); add(lora, `weight${i}`); add(lora, `mode${i}`); }
    server.coerceWidgetValues = () => {};
    server.getConfigInputNodes = () => ({ DrawThingsRefiner: [refiner], DrawThingsUpscaler: [upscaler], DrawThingsControlNet: [cnet], DrawThingsLoRA: [lora] });
    const selected = model("Import all", "v1", { modifier: "depth", keyword: "saved", custom: 42 });
    const config = { model: selected.file, refinerModel: selected.file, upscaler: selected.file, controls: [{ file: selected.file }], loras: [{ file: selected.file, weight: 0.7 }] };
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { readText: async () => JSON.stringify(config) } } });
    (globalThis as any).alert = (message: string) => { throw new Error(message); };
    fetchApi = async () => { await new Promise((r) => setTimeout(r, 2)); return response(catalog([selected])); };
    await importConfig(server);
    for (const widget of [main, refinerModel, upscalerModel, control, lora.widgets[1]]) assert.deepEqual(widget.value.value, selected);
    assert.equal(lora.widgets[2].value, 0.7);
    assert.equal(lora.loraCount, 1);
    assert.ok(children.every((node) => node.notifications > 0));
});

test("menu selections notify the existing LoRA dynamic-input hook", async () => {
    const { default: extension } = await import("../../web/src/dynamicInputs");
    class Lora {}
    (Lora as any).comfyClass = "DrawThingsLoRA";
    (extension.beforeRegisterNodeDef as any)(Lora, {}, app);
    const { node, widget } = widgetNode();
    node.inputs = [{ name: "lora", type: "DT_LORA" }];
    node.removeInput = (index: number) => node.inputs.splice(index, 1);
    node.addInput = (name: string, type: string) => node.inputs.push({ name, type });
    node.computeSize = () => [300, 200]; node.setSize = () => {};
    node.onWidgetChanged = (Lora.prototype as any).onWidgetChanged;
    fetchApi = async () => response(catalog([model("With image", "v1", { modifier: "depth" }), model("Without image", "v1")]));
    await widget.onClick({ e: {}, node, canvas: { ds: { scale: 1 } } });
    let menu = menus.at(-1); menu.options.callback(menu.items[1]);
    assert.equal(node.inputs[1].name, "control_image");
    await widget.onClick({ e: {}, node, canvas: { ds: { scale: 1 } } });
    menu = menus.at(-1); menu.options.callback(menu.items[2]);
    assert.equal(node.inputs.length, 1);
});

test("version matches sort before unrestricted models even when their names sort later", async () => {
    const server = sampler(); reset([server]);
    fetchApi = async () => response(catalog([model("A unrestricted"), model("Z matching", "v1"), model("B other", "v2")]));
    const items = await modelService.getMenuItems(server, "loras");
    assert.deepEqual(items.map((item) => item.value.name), ["Z matching", "A unrestricted", "B other"]);
});

test("model imports reuse a loaded catalog and refresh when a file is missing", async () => {
    const { node, widget } = widgetNode();
    node.getServer = () => ({ server: "localhost", port: 7900, useTls: false });
    let requests = 0;
    const first = model("First"), second = model("Second");
    fetchApi = async () => { requests++; return response(catalog(requests === 1 ? [first] : [first, second])); };
    await modelService.selectByFile(node, widget, first.file);
    await modelService.selectByFile(node, widget, first.file);
    assert.equal(requests, 1);
    await modelService.selectByFile(node, widget, second.file);
    assert.equal(requests, 2);
    assert.equal(widget.value.value.file, second.file);
});

test("LoRA and ControlNet migrations restore labels after replacing keyed or legacy values", async () => {
    // ComfyUI provides scripts/app.js at runtime; supply that external dependency in Node.
    const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
        return specifier === "../../scripts/app.js"
            ? { url: "data:text/javascript,export const app = window.comfyAPI.app.app;", shortCircuit: true }
            : nextResolve(specifier, context);
    } });
    const { default: modelExtension } = await import("../../web/src/dtModelNodes");
    const { default: loraExtension } = await import("../../web/src/lora");
    const { default: controlExtension } = await import("../../web/src/controlnet");
    hooks.deregister();
    const full = model("Juggernaut Reborn (8-bit)", "v1", { prefix: "", modifier: "none", default_scale: 12, text_encoder: "clip.ckpt", upcast_attention: false });
    for (const [comfyClass, extension, widgetName, type] of [
        ["DrawThingsLoRA", loraExtension, "lora", "loras"],
        ["DrawThingsControlNet", controlExtension, "control_name", "controlNets"],
    ] as const) {
        class Node {}
        (Node as any).comfyClass = comfyClass;
        // Match registration order: shared model hooks precede node-specific migrations.
        (modelExtension.beforeRegisterNodeDef as any)(Node, {}, app);
        (extension.beforeRegisterNodeDef as any)(Node, {}, app);
        for (const keyed of [true, false]) {
            const node: any = new Node(); node.comfyClass = comfyClass;
            node.updateWidgets = node.updateDynamicWidgets = () => {};
            node.inputs = [];
            const selection = JSON.parse(JSON.stringify(getMenuItem(full)));
            const widget: any = { name: widgetName, value: "(None selected)", options: { modelType: type } };
            node.widgets = comfyClass === "DrawThingsLoRA"
                ? [{ name: "buttons" }, widget, { name: "weight" }]
                : [widget, ...Array.from({ length: 7 }, (_, i) => ({ name: ["control_input_type", "control_mode", "control_weight", "control_start", "control_end", "global_average_pooling", "invert_image"][i] }))];
            node.onConfigure(keyed
                ? { widget_values_keyed: { [widgetName]: selection } }
                : { widgets_values: [selection, ...Array.from({ length: comfyClass === "DrawThingsLoRA" ? 1 : 7 }, () => 1)] });
            assert.equal(String(widget.value), full.name, `${comfyClass}, keyed=${keyed}`);
            assert.deepEqual(JSON.parse(JSON.stringify(widget.value)).value, full);
            assert.equal(node._lastSelectedModel[widgetName].value.file, full.file);
        }
    }
});

test("historical workflow selections retain their exact serialized wrapper and metadata", async () => {
    const { default: extension } = await import("../../web/src/dtModelNodes");
    let selections = 0;
    for (const file of ["old_version.json", "model_nodes.json"]) {
        const workflow = JSON.parse(await readFile(new URL(`../workflows/${file}`, import.meta.url), "utf8"));
        for (const savedNode of workflow.nodes) {
            const savedSelections = [
                ...savedNode.widgets_values ?? [],
                ...Object.values(savedNode.widget_values_keyed ?? {}),
                ...Object.values(savedNode._lastSelectedModel ?? {}),
            ].filter((value: any) => value?.value?.file);
            for (const selection of savedSelections) {
                class Node {}
                (Node as any).comfyClass = savedNode.type;
                (extension.beforeRegisterNodeDef as any)(Node, {}, app);
                const node: any = new Node(); node.comfyClass = savedNode.type;
                node.widgets = [{ name: "model", value: selection, options: { modelType: "models", values: ["(None selected)"] } }];
                node.onConfigure({});
                assert.equal(String(node.widgets[0].value), selection.value.name);
                assert.deepEqual(JSON.parse(JSON.stringify(node.widgets[0].value)), selection);
                selections++;
            }
        }
    }
    assert.ok(selections > 10, "exercise saved selections from both historical fixtures");
});


test("model arrows step by file, preserve metadata and notifications, and stop at the ends", async () => {
    const { node, widget } = widgetNode();
    const first = model("Alpha", "v1", { custom: 42 }), last = model("Beta", "v2");
    fetchApi = async () => response(catalog([last, first]));
    const options = { e: { canvasX: 390 }, node, canvas: { ds: { scale: 1 }, last_mouseclick: 123 } };
    const menuCount = menus.length;
    let updates = 0; node.updateDynamicWidgets = () => updates++;
    await widget.onClick(options);
    assert.deepEqual(widget.value.value, first);
    assert.equal(node.saved[0].value.custom, 42);
    assert.equal(options.canvas.last_mouseclick, 0);
    // Restored workflow wrappers have different identity from freshly loaded items.
    widget.value = JSON.parse(JSON.stringify(widget.value));
    await widget.incrementValue(options);
    assert.deepEqual(widget.value.value, last);
    await widget.incrementValue(options);
    assert.deepEqual(widget.value.value, last);
    await widget.onClick({ ...options, e: { canvasX: 110 } });
    assert.deepEqual(widget.value.value, first);
    await widget.decrementValue(options);
    assert.equal(widget.value, "(None selected)");
    await widget.decrementValue(options);
    assert.equal(widget.value, "(None selected)");
    assert.equal(updates, 4);
    assert.equal(menus.length, menuCount);
    widget.width = 200;
    await widget.onClick({ ...options, e: { canvasX: 290 } });
    assert.deepEqual(widget.value.value, first);
    await widget.onClick({ ...options, e: { canvasX: 200 } });
    assert.equal(menus.length, menuCount + 2);
});

test("LoRA, ControlNet and refiner arrows skip disabled models in both directions", async () => {
    for (const type of ["loras", "controlNets", "models"]) {
        const { node } = widgetNode();
        node.isDtServerNode = false;
        const server = sampler(2); graph.nodes.push(server);
        node.outputs = [{ links: [1] }]; graph.getLink = () => ({ target_id: 2 });
        const stepped: any = DtModelTypeHandler(node, type, ["DT_MODEL", { model_type: type }], app).widget;
        const first = model("A", "v1"), free = model("B"), disabled = model("C", "v2");
        fetchApi = async () => response(catalog([disabled, free, first]));
        const options = { e: {}, node, canvas: {} };
        await stepped.incrementValue(options);
        assert.equal(stepped.value.value.file, first.file);
        await stepped.incrementValue(options);
        assert.equal(stepped.value.value.file, free.file);
        await stepped.incrementValue(options);
        assert.equal(stepped.value.value.file, free.file);
        stepped.value = getMenuItem(disabled);
        await stepped.decrementValue(options);
        assert.equal(stepped.value.value.file, free.file);
        await stepped.decrementValue(options);
        assert.equal(stepped.value.value.file, first.file);
    }
});

test("textual inversion stepping does nothing and both arrow regions open menus", async () => {
    const { node, widget } = widgetNode(true);
    let requests = 0;
    fetchApi = async () => { requests++; return response(catalog([model("Embedding")])); };
    const options = { e: {}, node, canvas: { ds: { scale: 1 } } };
    await widget.incrementValue(options); await widget.decrementValue(options);
    assert.equal(requests, 0);
    assert.equal(widget.value, "...");
    for (const canvasX of [110, 390]) {
        const count = menus.length;
        await widget.onClick({ ...options, e: { canvasX } });
        assert.equal(menus.length, count + 2);
        assert.equal(widget.value, "...");
    }
});

test("arrow lookups keep selections on failures and ignore stale responses", async () => {
    const { node, widget } = widgetNode();
    const original = widget.value = getMenuItem(model("Saved"));
    const options = { e: {}, node, canvas: {} };
    fetchApi = async () => { throw new Error("offline"); };
    await widget.incrementValue(options);
    assert.equal(widget.value, "Not connected");
    widget.value = original;
    let finish: (response: any) => void;
    fetchApi = () => new Promise((resolve) => { finish = resolve; });
    const pending = widget.incrementValue(options);
    graph.nodes = [];
    finish!(response(catalog([model("Delayed")])));
    await pending;
    assert.equal(widget.value, original);
});

async function useSamplerPrototype(node: any) {
    const { default: extension } = await import("../../web/src/dtModelNodes");
    class Sampler {}
    (Sampler as any).comfyClass = "DrawThingsSampler";
    (extension.beforeRegisterNodeDef as any)(Sampler, {}, app);
    Object.setPrototypeOf(node, Sampler.prototype);
    node.comfyClass = "DrawThingsSampler";
    delete node.saveSelectedModels;
    delete node.getModelVersion;
}

test("sampler watches every server parameter and restores the saved model after reconnecting", async () => {
    const { node, widget } = widgetNode();
    await useSamplerPrototype(node);
    delete node.getServer;
    node.widgets.push(
        { name: "server", value: "localhost" },
        { name: "port", value: 7910 },
        { name: "use_tls", value: false },
    );
    const original = widget.value = getMenuItem(model("Saved", "flux1", { custom: { keep: true } }));
    let requests = 0;
    fetchApi = async (_path, options) => {
        requests++;
        const body = options.body;
        return body.get("server") === "localhost" && body.get("port") === "7910" && body.get("use_tls") === "false"
            ? response(catalog([])) : { ok: false };
    };
    const settle = () => new Promise((resolve) => setImmediate(resolve));
    for (const [name, invalid] of [["server", "offline"], ["port", 1], ["use_tls", true]] as const) {
        const param = node.widgets.find((w: any) => w.name === name);
        const valid = param.value;
        param.value = invalid;
        node.onWidgetChanged(name);
        await settle();
        assert.equal(widget.value, "Not connected");
        assert.deepEqual(JSON.parse(JSON.stringify(node.lastSelectedModel.model)), JSON.parse(JSON.stringify(original)));
        await widget.onClick({ e: {}, node, canvas: { ds: { scale: 1 } } });
        const menu = menus.at(-1);
        assert.deepEqual(menu.items.map((item: any) => item.content), ["Not connected", "Couldn't connect to server. Check server settings and retry"]);
        for (const item of menu.items) menu.options.callback(item);
        assert.equal(widget.value, "Not connected");
        assert.deepEqual(JSON.parse(JSON.stringify(node.lastSelectedModel.model)), JSON.parse(JSON.stringify(original)));
        param.value = valid;
        node.onWidgetChanged(name);
        await settle();
        assert.deepEqual(JSON.parse(JSON.stringify(widget.value)), JSON.parse(JSON.stringify(original)));
        assert.equal(String(widget.value), "Saved");
    }
    const before = requests;
    node.onWidgetChanged("seed");
    await settle();
    assert.equal(requests, before);
    node.onAdded();
    await settle();
    assert.equal(requests, before + 1);
    node.onConfigure({ widget_values_keyed: {} });
    await settle();
    assert.equal(requests, before + 2);
});

test("every model menu blocks cached bridge models offline without changing other node selections", async () => {
    for (const type of ["models", "loras", "controlNets", "upscalers", "textualInversions"]) {
        const { node: server } = widgetNode();
        await useSamplerPrototype(server);
        const original = server.widgets[0].value = getMenuItem(model("Sampler saved"));
        const child: any = { ...server, id: 2, isDtServerNode: false, widgets: [], outputs: [{ links: [1] }] };
        child.addWidget = (_type: string, name: string, value: any, callback: any, options: any) => {
            const widget = new ComboWidget({ type: "combo", name, value, callback, options, y: 0 }, child);
            child.widgets.push(widget); return widget;
        };
        graph.nodes.push(child);
        graph.getLink = () => ({ target_id: 1 });
        const widget: any = DtModelTypeHandler(child, type, ["DT_MODEL", { model_type: type }], app).widget;
        const selected = widget.value = type === "textualInversions" ? "..." : getMenuItem(model("Child saved"));
        settings.set("drawthings.bridge_mode.enabled", true);
        fetchApi = async () => { throw new Error("offline"); };
        await widget.onClick({ e: {}, node: child, canvas: { ds: { scale: 1 } } });
        const menu = menus.at(-1);
        assert.deepEqual(menu.items.map((item: any) => item.content), ["Not connected", "Couldn't connect to server. Check server settings and retry"]);
        for (const item of menu.items) menu.options.callback(item);
        assert.equal(widget.value, selected);
        assert.equal(server.widgets[0].value, "Not connected");
        assert.equal(server.lastSelectedModel.model, original);
        fetchApi = async () => response(catalog([model("Back online")]));
        await widget.onClick({ e: {}, node: child, canvas: { ds: { scale: 1 } } });
        assert.equal(menus.at(-1).items[0], type === "textualInversions" ? "..." : "(None selected)");
        assert.equal(server.widgets[0].value.value.file, original.value.file);
        assert.equal(widget.value, selected);
    }
});

test("late server checks cannot overwrite a newer connection state", async () => {
    const { node, widget } = widgetNode();
    await useSamplerPrototype(node);
    const original = widget.value = getMenuItem(model("Saved"));
    let tls = false;
    node.getServer = () => ({ server: "race", port: 7911, useTls: tls });
    let finish: (value: any) => void;
    fetchApi = () => new Promise((resolve) => { finish = resolve; });
    const old = updateServerConnection(node);
    tls = true;
    fetchApi = async () => ({ ok: false });
    await assert.rejects(updateServerConnection(node));
    assert.equal(widget.value, "Not connected");
    finish!(response(catalog([])));
    await old;
    assert.equal(widget.value, "Not connected");
    assert.deepEqual(JSON.parse(JSON.stringify(node.lastSelectedModel.model)), JSON.parse(JSON.stringify(original)));
    fetchApi = async () => response(catalog([]));
    await updateServerConnection(node);
    assert.equal(widget.value.value.file, original.value.file);
});
