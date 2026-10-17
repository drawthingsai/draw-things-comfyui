import type { ComfyApp } from "@comfyorg/comfyui-frontend-types";
import type { ComboWidget, IWidget, LGraph, LGraphNode } from "@comfyorg/litegraph";
import { modelVersions } from "./modelVersions";
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
        toString() { return this.value.name ?? this.value.file; },
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

class ConnectionError extends Error {
    constructor() { super("Couldn't connect to server. Check server settings and retry"); }
}

const connectionRequests = new WeakMap<DTModelNode, number>();

// Check the live server even when a successful local or bridge catalog is cached.
export async function updateServerConnection(node: DTModelNode): Promise<ModelInfo> {
    const address = node.getServer?.();
    const key = JSON.stringify(address);
    const request = (connectionRequests.get(node) ?? 0) + 1;
    connectionRequests.set(node, request);
    const graph = node.graph;
    const current = () => connectionRequests.get(node) === request
        && JSON.stringify(node.getServer?.()) === key && node.graph === graph
        && (!graph || graph.getNodeById(node.id) === node);
    const update = (connected: boolean) => {
        if (!current() || !node.isDtServerNode) return;
        const widgets = (node.widgets ?? []).filter((w) => (w.options as any)?.modelType === "models");
        if (!connected) {
            if (widgets.some((widget) => widget.value !== "Not connected")) node.saveSelectedModels?.();
            for (const widget of widgets) widget.value = "Not connected";
        } else {
            for (const widget of widgets) {
                if (widget.value === "Not connected")
                    widget.value = restoreModelLabel(node._lastSelectedModel?.[widget.name] ?? "(None selected)");
            }
        }
        node.setDirtyCanvas?.(true, true);
    };
    try {
        if (!address) throw new ConnectionError();
        const models = await getModels(address.server, address.port, address.useTls);
        update(true);
        return models;
    } catch {
        update(false);
        throw new ConnectionError();
    }
}

class ModelService {
    getCachedModels(node: DTModelNode): ModelInfo[] {
        if (getApp().extensionManager.setting.get("drawthings.bridge_mode.enabled"))
            return bridgeCache ? [bridgeCatalog(bridgeCache)] : [];
        return this.getCachedLocalModels(node);
    }
    getCachedLocalModels(node: DTModelNode): ModelInfo[] {
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
        const { servers } = this.context(node);
        const shouldFilterVersions = filterVersions && type !== "upscalers";
        const useBridgeCatalog = type !== "upscalers"
            && getApp().extensionManager.setting.get("drawthings.bridge_mode.enabled");
        if (!servers.length) throw new ConnectionError();
        const responses = await Promise.allSettled(servers.map(updateServerConnection));
        const available = responses.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
        if (!available.length) throw new ConnectionError();
        // A successful check may have just restored the sampler's model/version.
        const { versions } = this.context(node);
        let catalogs: ModelInfo[];
        if (useBridgeCatalog) catalogs = [await getBridgeModels()];
        else catalogs = available;
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
        const find = (catalogs: ModelInfo[]) => catalogs.flatMap((catalog) => catalog[type] ?? [])
            .find((model) => model.file === file);
        let model = find(this.getCachedLocalModels(node));
        if (!model) {
            // Presets are independent of menu mode, availability and version filters.
            const local = await Promise.allSettled(this.context(node).servers.map(async (server) => {
                const address = server.getServer?.();
                if (!address) throw new Error("Missing server address");
                return getModels(address.server, address.port, address.useTls);
            }));
            model = find(local.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
        }
        if (!model) {
            try { model = find([allModelsCatalog(await getCombinedModels())]); }
            catch { /* Unavailable catalogs must not prevent importing a filename. */ }
        }
        setModelValue(node, widget, model ? getMenuItem(model) : {
            value: { file }, content: file,
        });
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
                if (item?.disabled || item === "Not connected" || !current()) return;
                widget.setValue(typeof item === "string" ? item : restoreModelLabel(item), { e, node: clickedNode, canvas });
            },
        });
        menu = open([{ content: "Loading models…", disabled: true }]);
        let items: any[];
        let disconnected = false;
        try {
            items = await getItems();
            if (isPrompt) {
                const prompt = String(node.widgets?.find((w) => w.name === "prompt")?.value ?? "");
                const tags = new Set([...prompt.matchAll(/<(.*?)>/gm)].map((m) => m[1]));
                items = items.map((item) => ({ ...item, content: `${tags.has(item.value.keyword) ? "✓ " : ""}${item.value.name} (${item.value.version})` }));
            }
            if (!items.length) items.push({ content: "No models available", disabled: true });
        } catch (error) {
            disconnected = error instanceof ConnectionError;
            items = disconnected ? [
                { content: "Not connected", disabled: true },
                { content: error.message, disabled: true },
            ] : [{ content: error instanceof Error ? error.message : "Couldn't retrieve models. Click to retry", disabled: true }];
        }
        if (!current() || !menu.root?.isConnected) { menu.close(); return; }
        menu.close();
        open(disconnected ? items : [isPrompt ? "..." : "(None selected)", ...items]);
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
let combinedLoad: Promise<CombinedModelsResponse> | undefined;
let combinedCache: CombinedModelsResponse | undefined;
async function getCombinedModels(): Promise<CombinedModelsResponse> {
    if (combinedCache) return combinedCache;
    if (!combinedLoad) combinedLoad = (async () => {
        const response = await window.comfyAPI.api.api.fetchApi("/dt_grpc/combined_models");
        if (!response.ok) throw new Error("Couldn't retrieve model metadata");
        const combined: CombinedModelsResponse = await response.json();
        combinedCache = combined;
        return combined;
    })();
    const load = combinedLoad;
    try { return await load; }
    finally { if (combinedLoad === load) combinedLoad = undefined; }
}

function allModelsCatalog(combined: CombinedModelsResponse): ModelInfo {
    return {
        models: [...combined.officialModels, ...combined.communityModels, ...combined.uncuratedModels],
        controlNets: [...combined.officialCnets, ...combined.communityCnets],
        loras: [...combined.officialLoras, ...combined.communityLoras],
        textualInversions: [...combined.communityEmbeddings],
        upscalers: [],
    };
}

async function getBridgeModels(): Promise<ModelInfo> {
    if (bridgeCache) return bridgeCatalog(bridgeCache);
    if (!bridgeLoad) bridgeLoad = (async () => {
        const api = window.comfyAPI.api.api;
        const [filesResponse, combined] = await Promise.all([
            api.fetchApi("/dt_grpc/bridge_models"), getCombinedModels(),
        ]);
        if (!filesResponse.ok) throw new Error("Couldn't retrieve DT+ models. Click to retry");
        const files: string[] = await filesResponse.json();
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

function getVersionAbbrev(version: string) {
    return modelVersions.find((model) => model.version === version)?.tag ?? version;
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
