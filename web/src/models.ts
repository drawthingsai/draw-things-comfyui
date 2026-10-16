import type { ComfyApp } from "@comfyorg/comfyui-frontend-types";
import type { ComboWidget, IWidget, LGraph, LGraphNode } from "@comfyorg/litegraph";
import { combinedModelsResponseKeys, type CombinedModelsResponse } from "./modelsTypes";
import { getApp, getLiteGraph } from "./util";

export interface DTModelNode extends LGraphNode {
    isDtServerNode?: boolean;
    getServer?: () => { server: string; port: number | string; useTls: boolean };
    getModelVersion?: () => string | undefined;
    saveSelectedModels?: () => void;
    updateDynamicWidgets?: () => void;
    _lastSelectedModel?: Record<string, any>;
}

export interface Model {
    name: string;
    file: string;
    version?: string;
    [key: string]: any;
}
export interface ModelInfo {
    models: Model[];
    controlNets: Model[];
    loras: Model[];
    textualInversions: Model[];
    upscalers: Model[];
    [key: string]: Model[];
}

export function getMenuItem(model: Model, disabled = false) {
    return {
        value: model,
        content: model.version ? `${model.name} (${getVersionAbbrev(model.version)})` : model.name,
        toString() { return model.name; },
        disabled,
    };
}

// Workflows and the Python backend require the full model inside this wrapper.
export function restoreModelLabel(selection: any) {
    if (!selection || typeof selection !== "object" || !selection.value) return selection;
    return {
        ...selection,
        content: selection.content ?? getMenuItem(selection.value).content,
        toString() { return this.value.name; },
    };
}

// Run after node-specific migrations, which may replace positional widget values.
export function restoreModelSelections(node: DTModelNode) {
    const selections = node._lastSelectedModel ?? {};
    for (const widget of node.widgets ?? []) {
        const type = (widget.options as any)?.modelType;
        if (!type) continue;
        const saved = selections[widget.name];
        const value = widget.value === "Not connected" || widget.value === "Click to retry"
            ? saved ?? (type === "textualInversions" ? "..." : "(None selected)") : widget.value;
        widget.value = restoreModelLabel(value);
        if (saved) selections[widget.name] = restoreModelLabel(saved);
    }
    node.saveSelectedModels?.();
}

export function getNodesRecursive(graph: LGraph, seen = new Set<LGraph>()): DTModelNode[] {
    if (seen.has(graph)) return [];
    seen.add(graph);
    return (graph.nodes ?? []).flatMap((node: any) => [
        node, ...(node.subgraph ? getNodesRecursive(node.subgraph, seen) : []),
    ]);
}

// Follow every output, including chains and the installed LiteGraph subgraph IO slots.
export function findServerNodes(node: DTModelNode): DTModelNode[] {
    const root = (node.graph as any)?.rootGraph ?? getApp().graph;
    const nodes = root ? getNodesRecursive(root) : [];
    const visited = new Set<LGraphNode>();
    const traversedLinks = new Set<object>();
    const servers = new Set<DTModelNode>();
    function followLinks(graph: any, links: readonly number[] = []) {
        for (const id of links) {
            const link = graph?.getLink(id);
            if (!link || traversedLinks.has(link)) continue;
            traversedLinks.add(link);
            if (graph.outputNode?.id === link.target_id) {
                for (const container of nodes as any[]) {
                    if (container.subgraph === graph)
                        followLinks(container.graph, container.outputs?.[link.target_slot]?.links ?? []);
                }
            } else {
                const target = graph.getNodeById(link.target_id);
                if (target?.subgraph) {
                    const slot = target.subgraph.inputNode?.slots?.[link.target_slot];
                    const innerLinks = slot?.getLinks?.() ?? [];
                    followLinks(target.subgraph, innerLinks.map((inner: any) => inner.id));
                } else if (target) visit(target);
            }
        }
    }
    function visit(current: DTModelNode) {
        if (visited.has(current)) return;
        visited.add(current);
        if (current.isDtServerNode) { servers.add(current); return; }
        for (const output of current.outputs ?? []) followLinks(current.graph, output.links ?? []);
    }
    visit(node);
    return [...servers];
}

function settingsKey() {
    const setting = getApp().extensionManager.setting;
    return JSON.stringify([
        !!setting.get("drawthings.bridge_mode.enabled"),
        !!setting.get("drawthings.bridge_mode.community"),
        !!setting.get("drawthings.bridge_mode.uncurated"),
    ]);
}

class ModelService {
    getCachedModels(node: DTModelNode): ModelInfo[] {
        if (getApp().extensionManager.setting.get("drawthings.bridge_mode.enabled"))
            return bridgeCache ? [bridgeCatalog(bridgeCache)] : [];
        return this.context(node).servers.flatMap((server) => {
            const address = server.getServer?.();
            const cached = address && modelInfoStore.get(JSON.stringify([address.server, String(address.port), address.useTls]));
            return cached ? [cached] : [];
        });
    }
    context(node: DTModelNode) {
        const connected = findServerNodes(node);
        let servers = connected;
        if (!servers.length) {
            const root = (node.graph as any)?.rootGraph ?? getApp().graph;
            const candidates = root ? getNodesRecursive(root).filter((n) => n.isDtServerNode) : [];
            const unique = new Map(candidates.map((n) => [JSON.stringify(n.getServer?.()), n]));
            if (unique.size === 1) servers = [...unique.values()];
        }
        return { servers, versions: connected.map((n) => n.getModelVersion?.()).filter((v): v is string => !!v) };
    }

    contextKey(node: DTModelNode) {
        const { servers, versions } = this.context(node);
        return JSON.stringify([settingsKey(), servers.map((n) => n.getServer?.()), versions]);
    }

    async getMenuItems(node: DTModelNode, type: string, filterVersions = true) {
        const { servers, versions } = this.context(node);
        const shouldFilterVersions = filterVersions && type !== "upscalers";
        const useBridgeCatalog = type !== "upscalers"
            && getApp().extensionManager.setting.get("drawthings.bridge_mode.enabled");
        if (!useBridgeCatalog && !servers.length) throw new Error("Connect to a sampler node to list available models");
        let catalogs: ModelInfo[];
        if (useBridgeCatalog) catalogs = [await getBridgeModels()];
        else {
            const responses = await Promise.allSettled(servers.map(async (server) => {
                const address = server.getServer?.();
                if (!address) throw new Error("Check server and click to retry");
                return getModels(address.server, address.port, address.useTls);
            }));
            catalogs = responses.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
            if (!catalogs.length) throw (responses.find((result) => result.status === "rejected") as PromiseRejectedResult).reason;
        }
        const models = new Map<string, Model>();
        for (const catalog of catalogs)
            for (const model of catalog?.[type] ?? []) if (!models.has(model.file)) models.set(model.file, model);
        const rank = (model: Model) => !shouldFilterVersions || !versions.length ? 0
            : model.version ? (versions.includes(model.version) ? 0 : 2) : 1;
        return [...models.values()].map((model) => getMenuItem(model,
            !!(shouldFilterVersions && model.version && versions.length && !versions.includes(model.version)),
        )).sort((a, b) => rank(a.value) - rank(b.value)
            || a.value.name.localeCompare(b.value.name, undefined, { sensitivity: "base" }));
    }

    async selectByFile(node: DTModelNode, widget: IWidget, file: unknown) {
        if (!file) { setModelValue(node, widget, "(None selected)"); return; }
        const type = (widget.options as any)?.modelType;
        const cached = this.getCachedModels(node).flatMap((catalog) => catalog[type] ?? [])
            .find((model) => model.file === file);
        const selection = cached ? getMenuItem(cached)
            : (await this.getMenuItems(node, type, false)).find((item) => item.value.file === file);
        if (selection) setModelValue(node, widget, selection);
    }
}
export const modelService = new ModelService();

export function setModelValue(node: DTModelNode, widget: IWidget, selection: any) {
    const canvas = getApp().canvas;
    (widget as ComboWidget).setValue(restoreModelLabel(selection), { node, canvas, e: undefined } as any);
}

export function DtModelTypeHandler(node: DTModelNode, inputName: string, inputData: any, app: ComfyApp) {
    const LiteGraph = getLiteGraph();
    const type: string = inputData[1].model_type;
    const isPrompt = type === "textualInversions";
    const widget = node.addWidget("combo", inputName, isPrompt ? "..." : "(None selected)",
        () => {
            node.saveSelectedModels?.();
            if (node.isDtServerNode && type === "models") node.updateDynamicWidgets?.();
        },
        { values: [isPrompt ? "..." : "(None selected)"], modelType: type } as any,
    ) as ComboWidget;
    const unrestricted = type === "upscalers" || (type === "models" && !!node.isDtServerNode);
    const getItems = () => modelService.getMenuItems(node, type, !unrestricted);
    let request = 0;
    function startRequest() {
        const token = ++request;
        const graph = node.graph;
        const context = modelService.contextKey(node);
        return () => token === request && node.graph === graph && !!graph
            && graph.getNodeById(node.id) === node && modelService.contextKey(node) === context;
    }
    async function step(delta: number, options: Parameters<ComboWidget["incrementValue"]>[0]) {
        if (isPrompt) return;
        const current = startRequest();
        const value = widget.value;
        let items: any[];
        try {
            items = ["(None selected)", ...await getItems()];
        } catch {
            // Keep the saved selection when the catalog is unavailable; the menu allows retrying.
            return;
        }
        if (!current() || widget.value !== value) return;
        const index = items.findIndex((item) => typeof item === "string"
            ? item === value : item.value.file === (value as any)?.value?.file);
        let next = index + delta;
        while (next >= 0 && next < items.length && items[next].disabled) next += delta;
        if (next < 0 || next >= items.length) return;
        options.canvas.last_mouseclick = 0;
        widget.setValue(restoreModelLabel(items[next]), options);
    }
    widget.incrementValue = (options) => step(1, options);
    widget.decrementValue = (options) => step(-1, options);
    widget.canIncrement = () => !isPrompt;
    widget.canDecrement = () => !isPrompt && widget.value !== "(None selected)";
    widget.onClick = async ({ e, node: clickedNode, canvas }) => {
        if (!isPrompt) {
            const x = e.canvasX - clickedNode.pos[0];
            const width = widget.width || clickedNode.size[0];
            if (x < 40) return widget.decrementValue({ e, node: clickedNode, canvas });
            if (x > width - 40) return widget.incrementValue({ e, node: clickedNode, canvas });
        }
        const current = startRequest();
        let menu: any;
        const open = (items: any[]) => new LiteGraph.ContextMenu(items, {
            scale: Math.max(1, canvas.ds.scale), event: e, className: "dark",
            callback: (item: any) => {
                if (item?.disabled || !current()) return;
                widget.setValue(typeof item === "string" ? item : restoreModelLabel(item), { e, node: clickedNode, canvas });
            },
        });
        menu = open([{ content: "Loading models…", disabled: true }]);
        let items: any[];
        try {
            items = await getItems();
            if (isPrompt) {
                const prompt = String(node.widgets?.find((w) => w.name === "prompt")?.value ?? "");
                const tags = new Set([...prompt.matchAll(/<(.*?)>/gm)].map((m) => m[1]));
                items = items.map((item) => ({ ...item, content: `${tags.has(item.value.keyword) ? "✓ " : ""}${item.value.name} (${item.value.version})` }));
            }
            if (!items.length) items.push({ content: "No models available", disabled: true });
        } catch (error) {
            items = [{ content: error instanceof Error ? error.message : "Couldn't retrieve models. Click to retry", disabled: true }];
        }
        if (!current() || !menu.root?.isConnected) { menu.close(); return; }
        menu.close();
        open([isPrompt ? "..." : "(None selected)", ...items]);
    };
    return { widget };
}

export async function getFiles(server: string, port: number | string, useTls: boolean) {
    const body = new FormData();
    body.append("server", server);
    body.append("port", String(port));
    body.append("use_tls", String(useTls));
    return window.comfyAPI.api.api.fetchApi("/dt_grpc/files_info", { method: "POST", body });
}

const modelInfoStore = new Map<string, ModelInfo>();
const modelInfoLoads = new Map<string, Promise<ModelInfo>>();
export async function getModels(server: string, port: number | string, useTls: boolean): Promise<ModelInfo> {
    if (!server || !port || useTls === undefined) throw new Error("Check server and click to retry");
    const key = JSON.stringify([server, String(port), useTls]);
    let load = modelInfoLoads.get(key);
    if (!load) {
        load = (async () => {
            const response = await getFiles(server, port, useTls);
            if (!response.ok) throw new Error("Couldn't connect to server. Check server and click to retry");
            const models: ModelInfo = await response.json();
            testHack(models);
            modelInfoStore.set(key, models);
            return models;
        })();
        modelInfoLoads.set(key, load);
    }
    try { return await load; }
    finally { if (modelInfoLoads.get(key) === load) modelInfoLoads.delete(key); }
}

let bridgeLoad: Promise<CombinedModelsResponse> | undefined;
let bridgeCache: CombinedModelsResponse | undefined;
async function getBridgeModels(): Promise<ModelInfo> {
    if (bridgeCache) return bridgeCatalog(bridgeCache);
    if (!bridgeLoad) bridgeLoad = (async () => {
        const api = window.comfyAPI.api.api;
        const [filesResponse, combinedResponse] = await Promise.all([
            api.fetchApi("/dt_grpc/bridge_models"), api.fetchApi("/dt_grpc/combined_models"),
        ]);
        if (!filesResponse.ok || !combinedResponse.ok) throw new Error("Couldn't retrieve DT+ models. Click to retry");
        const files: string[] = await filesResponse.json();
        const combined: CombinedModelsResponse = await combinedResponse.json();
        const filtered = Object.fromEntries(combinedModelsResponseKeys.map((key) => [key,
            Array.isArray(combined[key]) ? combined[key].filter((model) => files.includes(model.file)) : [],
        ])) as unknown as CombinedModelsResponse;
        bridgeCache = filtered;
        return filtered;
    })();
    const load = bridgeLoad;
    let combined: CombinedModelsResponse;
    try { combined = await load; }
    finally { if (bridgeLoad === load) bridgeLoad = undefined; }
    return bridgeCatalog(combined);
}

function bridgeCatalog(combined: CombinedModelsResponse): ModelInfo {
    const setting = getApp().extensionManager.setting;
    const community = !!setting.get("drawthings.bridge_mode.community");
    const uncurated = !!setting.get("drawthings.bridge_mode.uncurated");
    return {
        models: [...combined.officialModels, ...(community ? combined.communityModels : []), ...(uncurated ? combined.uncuratedModels : [])],
        controlNets: [...combined.officialCnets, ...(community ? combined.communityCnets : [])],
        loras: [...combined.officialLoras, ...(community ? combined.communityLoras : [])],
        textualInversions: community ? [...combined.communityEmbeddings] : [],
        upscalers: [],
    };
}

const versionNames: Record<string, string> = {
    v1: "SD",
    v2: "SD2",
    "kandinsky2.1": "Kan",
    "sdxl_base_v0.9": "SDXL",
    "sdxl_refiner_v0.9": "SDXL",
    ssd_1b: "SSD",
    svd_i2v: "SVD",
    "wurstchen_v3.0_stage_c": "Wur",
    "wurstchen_v3.0_stage_b": "Wur",
    sd3: "SD3",
    pixart: "Pix",
    auraflow: "AF",
    flux1: "F1",
    sd3_large: "SD3L",
    hunyuan_video: "Hun",
    "wan_v2.1_1.3b": "Wan",
    "wan_v2.1_14b": "Wan",
    hidream_i1: "HiD",
    qwen_image: "Qwen",
    z_image: "Z Image",
    flux2: "F2",
    ltx2: "LTX2",
    "ltx2.3": "LTX2.3",
    "ltx2_3": "LTX2.3",
    "cosmos2.5_2b": "Cosmos2.5",
    "ernie_image": "Ernie",
    "seedvr2_3b": "SeedVR2 3b",
    "seedvr2_7b": "SeedVR2 7b",
};

function getVersionAbbrev(version: string) {
    return versionNames[version] ?? version;
}

function testHack(models: ModelInfo) {
    // horrible hacky test assist
    try {
        if (new URL(document.location.href).searchParams.has("dtgrpctesthack")) {
            if (Array.isArray(models?.models)) {
                models.models.push({
                    file: "fake_qwen.ckpt",
                    version: "qwen_image",
                    name: "Qwen Image Fake",
                });
                models.models.push({
                    file: "fake_wan.ckpt",
                    version: "wan_v2.1_14b",
                    name: "Wan Fake",
                });
            }
        }
    } catch { }
}
