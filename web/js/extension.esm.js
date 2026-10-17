import { app as app$1 } from '../../scripts/app.js';

// web/src/modelVersions.ts
var modelVersions = [
  {
    version: "auraflow",
    name: "AuraFlow",
    tag: "AF",
    features: ["cfgZero"]
  },
  {
    version: "flux1",
    name: "FLUX.1",
    tag: "F1",
    features: [
      "cfgZero",
      "resolutionDependentShift",
      "zeroNegativePrompt",
      "separateClipL",
      "guidanceEmbed",
      "teaCache"
    ]
  },
  {
    version: "flux2",
    name: "FLUX.2",
    tag: "F2",
    features: ["cfgZero", "guidanceEmbed", "resolutionDependentShift"]
  },
  {
    version: "flux2_4b",
    name: "FLUX.2 [4B]",
    tag: "F2",
    features: ["cfgZero", "resolutionDependentShift"]
  },
  {
    version: "flux2_9b",
    name: "FLUX.2 [9B]",
    tag: "F2",
    features: ["resolutionDependentShift", "cfgZero"]
  },
  {
    version: "hidream_i1",
    name: "HiDream-I1",
    tag: "HiD",
    features: [
      "cfgZero",
      "resolutionDependentShift",
      "zeroNegativePrompt",
      "separateClipL",
      "guidanceEmbed",
      "separateOpenClipG",
      "separateT5Text"
    ]
  },
  {
    version: "hunyuan_video",
    name: "HunyuanVideo",
    tag: "Hun",
    features: ["cfgZero", "numFrames", "compressionArtifacts", "teaCache", "guidanceEmbed"]
  },
  {
    version: "kandinsky2.1",
    name: "Kandinsky 2.1",
    tag: "Kan",
    features: ["deprecated"]
  },
  {
    version: "ltx2",
    name: "LTX-2",
    tag: "LTX2",
    features: ["cfgZero", "numFrames", "compressionArtifacts"]
  },
  {
    version: "ltx2.3",
    name: "LTX-2.3",
    tag: "LTX2.3",
    features: []
  },
  {
    version: "pixart",
    name: "PixArt",
    tag: "Pix",
    features: ["zeroNegativePrompt"]
  },
  {
    version: "qwen_image",
    name: "Qwen-Image",
    tag: "Qwen",
    features: ["cfgZero", "resolutionDependentShift"]
  },
  {
    version: "sd3",
    name: "Stable Diffusion 3",
    tag: "SD3",
    features: [
      "cfgZero",
      "resolutionDependentShift",
      "zeroNegativePrompt",
      "separateClipL",
      "t5TextEncoder",
      "separateOpenClipG"
    ]
  },
  {
    version: "sd3_large",
    name: "Stable Diffusion 3 Large",
    tag: "SD3L",
    features: [
      "cfgZero",
      "resolutionDependentShift",
      "zeroNegativePrompt",
      "separateClipL",
      "separateOpenClipG",
      "t5TextEncoder"
    ]
  },
  {
    version: "sdxl_base_v0.9",
    name: "Stable Diffusion XL 0.9 Base",
    tag: "SDXL",
    features: ["zeroNegativePrompt", "sdxlSize"]
  },
  {
    version: "sdxl_refiner_v0.9",
    name: "Stable Diffusion XL 0.9 Refiner",
    tag: "SDXL",
    features: ["zeroNegativePrompt", "sdxlSize"]
  },
  {
    version: "ssd_1b",
    name: "Segmind Stable Diffusion 1B",
    tag: "SSD",
    features: ["zeroNegativePrompt"]
  },
  {
    version: "svd_i2v",
    name: "Stable Video Diffusion Image-to-Video",
    tag: "SVD",
    features: ["numFrames", "svdOptions"]
  },
  {
    version: "v1",
    name: "Stable Diffusion",
    tag: "SD",
    features: []
  },
  {
    version: "v2",
    name: "Stable Diffusion 2",
    tag: "SD2",
    features: []
  },
  {
    version: "wan_v2.1_1.3b",
    name: "Wan 2.1 [1.3B]",
    tag: "Wan",
    features: [
      "numFrames",
      "cfgZero",
      "causalInference",
      "compressionArtifacts",
      "teaCache"
    ]
  },
  {
    version: "wan_v2.1_14b",
    name: "Wan 2.1 [14B]",
    tag: "Wan",
    features: [
      "numFrames",
      "compressionArtifacts",
      "cfgZero",
      "causalInference",
      "teaCache"
    ]
  },
  {
    version: "wan_v2.2_5b",
    name: "Wan 2.2 [5B]",
    tag: "Wan",
    features: ["numFrames", "cfgZero", "causalInference", "compressionArtifacts"]
  },
  {
    version: "wurstchen_v3.0_stage_c",
    name: "W\xFCrstchen 3.0 Stage C",
    tag: "Wur",
    features: ["deprecated"]
  },
  {
    version: "z_image",
    name: "Z-Image",
    tag: "Z Image",
    features: ["cfgZero", "resolutionDependentShift"]
  },
  {
    version: "ernie_image",
    name: "ERNIE Image",
    tag: "Ernie",
    features: ["cfgZero"]
  },
  {
    version: "cosmos2.5_2b",
    name: "Cosmos 2.5 [2B]",
    tag: "Cosmos2.5",
    features: ["cfgZero", "resolutionDependentShift"]
  },
  {
    version: "ideogram_4",
    name: "Ideogram 4",
    tag: "Ideogram4",
    features: ["cfgZero", "resolutionDependentShift", "zeroNegativePrompt"]
  },
  {
    version: "krea_2",
    name: "Krea 2",
    tag: "Krea2",
    features: ["cfgZero", "resolutionDependentShift"]
  },
  {
    version: "minimax_h3",
    name: "MiniMax Hailuo 3",
    tag: "MiniMax",
    features: ["cfgZero", "resolutionDependentShift", "numFrames", "audioShift", "compressionArtifacts", "solAttention", "teaCache"]
  },
  {
    version: "qwen_image_2.1",
    name: "Qwen-Image 2.1",
    tag: "Qwen 2.1",
    features: ["cfgZero", "resolutionDependentShift"]
  },
  {
    version: "seedvr2_3b",
    name: "SeedVR2 3B",
    tag: "SeedVR2 3b",
    features: ["cfgZero", "resolutionDependentShift"]
  },
  {
    version: "seedvr2_7b",
    name: "SeedVR2 7B",
    tag: "SeedVR2 7b",
    features: ["cfgZero", "resolutionDependentShift"]
  }
];

// web/src/modelsTypes.ts
var combinedModelsResponseKeys = ["officialModels", "officialCnets", "officialLoras", "communityModels", "communityCnets", "communityLoras", "communityEmbeddings", "uncuratedModels"];

// web/src/util.ts
function setCallback(target, callbackName, callback) {
  const original = target[callbackName];
  target[callbackName] = function(...args) {
    const r = original?.apply(this, args);
    callback?.apply(this, args);
    return r;
  };
}
function updateProto(base, update) {
  const proto = base.prototype;
  for (const key in update) {
    const val = update[key];
    if (typeof val === "function" && typeof proto[key] === "function") {
      const original = proto[key];
      const added = val;
      proto[key] = function(...args) {
        const r = original.apply(this, args);
        try {
          added.apply(this, args);
        } finally {
          return r;
        }
      };
    } else if (isPropertyDescriptor(val)) {
      Object.defineProperty(proto, key, val);
    } else {
      proto[key] = val;
    }
  }
}
function isPropertyDescriptor(v) {
  if (v == null) return false;
  const hasDescKeys = "value" in v || "get" in v || "set" in v || "writable" in v || "enumerable" in v || "configurable" in v;
  return typeof v === "object" && hasDescKeys;
}
var propertyMap = {
  preserveOriginalAfterInpaint: "preserve_original",
  hiresFix: "high_res_fix",
  sampler: "sampler_name"
};
Object.fromEntries(Object.entries(propertyMap).map(([k, v]) => [v, k]));
function findWidgetByName(node, name) {
  return node.widgets?.find((w) => w.name === name);
}
function getApp() {
  return window.comfyAPI.app.app;
}
function getLiteGraph() {
  return window.LiteGraph;
}
function plainWidgetValues(node) {
  const keyed = {};
  for (const w of node.widgets ?? []) {
    if (w.value === void 0) continue;
    try {
      keyed[w.name] = JSON.parse(JSON.stringify(w.value));
    } catch {
    }
  }
  return keyed;
}

// web/src/models.ts
function getMenuItem(model, disabled = false) {
  return {
    value: model,
    content: model.version ? `${model.name} (${getVersionAbbrev(model.version)})` : model.name,
    toString() {
      return model.name;
    },
    disabled
  };
}
function restoreModelLabel(selection) {
  if (!selection || typeof selection !== "object" || !selection.value) return selection;
  return {
    ...selection,
    content: selection.content ?? getMenuItem(selection.value).content,
    toString() {
      return this.value.name ?? this.value.file;
    }
  };
}
function restoreModelSelections(node) {
  const selections = node._lastSelectedModel ?? {};
  for (const widget of node.widgets ?? []) {
    const type = widget.options?.modelType;
    if (!type) continue;
    const saved = selections[widget.name];
    const value = widget.value === "Not connected" || widget.value === "Click to retry" ? saved ?? (type === "textualInversions" ? "..." : "(None selected)") : widget.value;
    widget.value = restoreModelLabel(value);
    if (saved) selections[widget.name] = restoreModelLabel(saved);
  }
  node.saveSelectedModels?.();
}
function getNodesRecursive(graph, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(graph)) return [];
  seen.add(graph);
  return (graph.nodes ?? []).flatMap((node) => [
    node,
    ...node.subgraph ? getNodesRecursive(node.subgraph, seen) : []
  ]);
}
function findServerNodes(node) {
  const root = node.graph?.rootGraph ?? getApp().graph;
  const nodes = root ? getNodesRecursive(root) : [];
  const visited = /* @__PURE__ */ new Set();
  const traversedLinks = /* @__PURE__ */ new Set();
  const servers = /* @__PURE__ */ new Set();
  function followLinks(graph, links = []) {
    for (const id of links) {
      const link = graph?.getLink(id);
      if (!link || traversedLinks.has(link)) continue;
      traversedLinks.add(link);
      if (graph.outputNode?.id === link.target_id) {
        for (const container of nodes) {
          if (container.subgraph === graph)
            followLinks(container.graph, container.outputs?.[link.target_slot]?.links ?? []);
        }
      } else {
        const target = graph.getNodeById(link.target_id);
        if (target?.subgraph) {
          const slot = target.subgraph.inputNode?.slots?.[link.target_slot];
          const innerLinks = slot?.getLinks?.() ?? [];
          followLinks(target.subgraph, innerLinks.map((inner) => inner.id));
        } else if (target) visit(target);
      }
    }
  }
  function visit(current) {
    if (visited.has(current)) return;
    visited.add(current);
    if (current.isDtServerNode) {
      servers.add(current);
      return;
    }
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
    !!setting.get("drawthings.bridge_mode.uncurated")
  ]);
}
var ConnectionError = class extends Error {
  constructor() {
    super("Couldn't connect to server. Check server settings and retry");
  }
};
var connectionRequests = /* @__PURE__ */ new WeakMap();
async function updateServerConnection(node) {
  const address = node.getServer?.();
  const key = JSON.stringify(address);
  const request = (connectionRequests.get(node) ?? 0) + 1;
  connectionRequests.set(node, request);
  const graph = node.graph;
  const current = () => connectionRequests.get(node) === request && JSON.stringify(node.getServer?.()) === key && node.graph === graph && (!graph || graph.getNodeById(node.id) === node);
  const update = (connected) => {
    if (!current() || !node.isDtServerNode) return;
    const widgets = (node.widgets ?? []).filter((w) => w.options?.modelType === "models");
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
var ModelService = class {
  getCachedModels(node) {
    if (getApp().extensionManager.setting.get("drawthings.bridge_mode.enabled"))
      return bridgeCache ? [bridgeCatalog(bridgeCache)] : [];
    return this.getCachedLocalModels(node);
  }
  getCachedLocalModels(node) {
    return this.context(node).servers.flatMap((server) => {
      const address = server.getServer?.();
      const cached = address && modelInfoStore.get(JSON.stringify([address.server, String(address.port), address.useTls]));
      return cached ? [cached] : [];
    });
  }
  context(node) {
    const connected = findServerNodes(node);
    let servers = connected;
    if (!servers.length) {
      const root = node.graph?.rootGraph ?? getApp().graph;
      const candidates = root ? getNodesRecursive(root).filter((n) => n.isDtServerNode) : [];
      const unique = new Map(candidates.map((n) => [JSON.stringify(n.getServer?.()), n]));
      if (unique.size === 1) servers = [...unique.values()];
    }
    return { servers, versions: connected.map((n) => n.getModelVersion?.()).filter((v) => !!v) };
  }
  contextKey(node) {
    const { servers, versions } = this.context(node);
    return JSON.stringify([settingsKey(), servers.map((n) => n.getServer?.()), versions]);
  }
  async getMenuItems(node, type, filterVersions = true) {
    const { servers } = this.context(node);
    const shouldFilterVersions = filterVersions && type !== "upscalers";
    const useBridgeCatalog = type !== "upscalers" && getApp().extensionManager.setting.get("drawthings.bridge_mode.enabled");
    if (!servers.length) throw new ConnectionError();
    const responses = await Promise.allSettled(servers.map(updateServerConnection));
    const available = responses.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    if (!available.length) throw new ConnectionError();
    const { versions } = this.context(node);
    let catalogs;
    if (useBridgeCatalog) catalogs = [await getBridgeModels()];
    else catalogs = available;
    const models = /* @__PURE__ */ new Map();
    for (const catalog of catalogs)
      for (const model of catalog?.[type] ?? []) if (!models.has(model.file)) models.set(model.file, model);
    const rank = (model) => !shouldFilterVersions || !versions.length ? 0 : model.version ? versions.includes(model.version) ? 0 : 2 : 1;
    return [...models.values()].map((model) => getMenuItem(
      model,
      !!(shouldFilterVersions && model.version && versions.length && !versions.includes(model.version))
    )).sort((a, b) => rank(a.value) - rank(b.value) || a.value.name.localeCompare(b.value.name, void 0, { sensitivity: "base" }));
  }
  async selectByFile(node, widget, file) {
    if (!file) {
      setModelValue(node, widget, "(None selected)");
      return;
    }
    const type = widget.options?.modelType;
    const find = (catalogs) => catalogs.flatMap((catalog) => catalog[type] ?? []).find((model2) => model2.file === file);
    let model = find(this.getCachedLocalModels(node));
    if (!model) {
      const local = await Promise.allSettled(this.context(node).servers.map(async (server) => {
        const address = server.getServer?.();
        if (!address) throw new Error("Missing server address");
        return getModels(address.server, address.port, address.useTls);
      }));
      model = find(local.flatMap((result) => result.status === "fulfilled" ? [result.value] : []));
    }
    if (!model) {
      try {
        model = find([allModelsCatalog(await getCombinedModels())]);
      } catch {
      }
    }
    setModelValue(node, widget, model ? getMenuItem(model) : {
      value: { file },
      content: file
    });
  }
};
var modelService = new ModelService();
function setModelValue(node, widget, selection) {
  const canvas = getApp().canvas;
  widget.setValue(restoreModelLabel(selection), { node, canvas, e: void 0 });
}
function DtModelTypeHandler(node, inputName, inputData, app4) {
  const LiteGraph = getLiteGraph();
  const type = inputData[1].model_type;
  const isPrompt = type === "textualInversions";
  const widget = node.addWidget(
    "combo",
    inputName,
    isPrompt ? "..." : "(None selected)",
    () => {
      node.saveSelectedModels?.();
      if (node.isDtServerNode && type === "models") node.updateDynamicWidgets?.();
    },
    { values: [isPrompt ? "..." : "(None selected)"], modelType: type }
  );
  const unrestricted = type === "upscalers" || type === "models" && !!node.isDtServerNode;
  const getItems = () => modelService.getMenuItems(node, type, !unrestricted);
  let request = 0;
  function startRequest() {
    const token = ++request;
    const graph = node.graph;
    const context = modelService.contextKey(node);
    return () => token === request && node.graph === graph && !!graph && graph.getNodeById(node.id) === node && modelService.contextKey(node) === context;
  }
  async function step(delta, options) {
    if (isPrompt) return;
    const current = startRequest();
    const value = widget.value;
    let items;
    try {
      items = ["(None selected)", ...await getItems()];
    } catch {
      return;
    }
    if (!current() || widget.value !== value) return;
    const index = items.findIndex((item) => typeof item === "string" ? item === value : item.value.file === value?.value?.file);
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
    let menu;
    const open = (items2) => new LiteGraph.ContextMenu(items2, {
      scale: Math.max(1, canvas.ds.scale),
      event: e,
      className: "dark",
      callback: (item) => {
        if (item?.disabled || item === "Not connected" || !current()) return;
        widget.setValue(typeof item === "string" ? item : restoreModelLabel(item), { e, node: clickedNode, canvas });
      }
    });
    menu = open([{ content: "Loading models\u2026", disabled: true }]);
    let items;
    let disconnected = false;
    try {
      items = await getItems();
      if (isPrompt) {
        const prompt = String(node.widgets?.find((w) => w.name === "prompt")?.value ?? "");
        const tags = new Set([...prompt.matchAll(/<(.*?)>/gm)].map((m) => m[1]));
        items = items.map((item) => ({ ...item, content: `${tags.has(item.value.keyword) ? "\u2713 " : ""}${item.value.name} (${item.value.version})` }));
      }
      if (!items.length) items.push({ content: "No models available", disabled: true });
    } catch (error) {
      disconnected = error instanceof ConnectionError;
      items = disconnected ? [
        { content: "Not connected", disabled: true },
        { content: error.message, disabled: true }
      ] : [{ content: error instanceof Error ? error.message : "Couldn't retrieve models. Click to retry", disabled: true }];
    }
    if (!current() || !menu.root?.isConnected) {
      menu.close();
      return;
    }
    menu.close();
    open(disconnected ? items : [isPrompt ? "..." : "(None selected)", ...items]);
  };
  return { widget };
}
async function getFiles(server, port, useTls) {
  const body = new FormData();
  body.append("server", server);
  body.append("port", String(port));
  body.append("use_tls", String(useTls));
  return window.comfyAPI.api.api.fetchApi("/dt_grpc/files_info", { method: "POST", body });
}
var modelInfoStore = /* @__PURE__ */ new Map();
var modelInfoLoads = /* @__PURE__ */ new Map();
async function getModels(server, port, useTls) {
  if (!server || !port || useTls === void 0) throw new Error("Check server and click to retry");
  const key = JSON.stringify([server, String(port), useTls]);
  let load = modelInfoLoads.get(key);
  if (!load) {
    load = (async () => {
      const response = await getFiles(server, port, useTls);
      if (!response.ok) throw new Error("Couldn't connect to server. Check server and click to retry");
      const models = await response.json();
      testHack(models);
      modelInfoStore.set(key, models);
      return models;
    })();
    modelInfoLoads.set(key, load);
  }
  try {
    return await load;
  } finally {
    if (modelInfoLoads.get(key) === load) modelInfoLoads.delete(key);
  }
}
var bridgeLoad;
var bridgeCache;
var combinedLoad;
var combinedCache;
async function getCombinedModels() {
  if (combinedCache) return combinedCache;
  if (!combinedLoad) combinedLoad = (async () => {
    const response = await window.comfyAPI.api.api.fetchApi("/dt_grpc/combined_models");
    if (!response.ok) throw new Error("Couldn't retrieve model metadata");
    const combined = await response.json();
    combinedCache = combined;
    return combined;
  })();
  const load = combinedLoad;
  try {
    return await load;
  } finally {
    if (combinedLoad === load) combinedLoad = void 0;
  }
}
function allModelsCatalog(combined) {
  return {
    models: [...combined.officialModels, ...combined.communityModels, ...combined.uncuratedModels],
    controlNets: [...combined.officialCnets, ...combined.communityCnets],
    loras: [...combined.officialLoras, ...combined.communityLoras],
    textualInversions: [...combined.communityEmbeddings],
    upscalers: []
  };
}
async function getBridgeModels() {
  if (bridgeCache) return bridgeCatalog(bridgeCache);
  if (!bridgeLoad) bridgeLoad = (async () => {
    const api = window.comfyAPI.api.api;
    const [filesResponse, combined2] = await Promise.all([
      api.fetchApi("/dt_grpc/bridge_models"),
      getCombinedModels()
    ]);
    if (!filesResponse.ok) throw new Error("Couldn't retrieve DT+ models. Click to retry");
    const files = await filesResponse.json();
    const filtered = Object.fromEntries(combinedModelsResponseKeys.map((key) => [
      key,
      Array.isArray(combined2[key]) ? combined2[key].filter((model) => files.includes(model.file)) : []
    ]));
    bridgeCache = filtered;
    return filtered;
  })();
  const load = bridgeLoad;
  let combined;
  try {
    combined = await load;
  } finally {
    if (bridgeLoad === load) bridgeLoad = void 0;
  }
  return bridgeCatalog(combined);
}
function bridgeCatalog(combined) {
  const setting = getApp().extensionManager.setting;
  const community = !!setting.get("drawthings.bridge_mode.community");
  const uncurated = !!setting.get("drawthings.bridge_mode.uncurated");
  return {
    models: [...combined.officialModels, ...community ? combined.communityModels : [], ...uncurated ? combined.uncuratedModels : []],
    controlNets: [...combined.officialCnets, ...community ? combined.communityCnets : []],
    loras: [...combined.officialLoras, ...community ? combined.communityLoras : []],
    textualInversions: community ? [...combined.communityEmbeddings] : [],
    upscalers: []
  };
}
function getVersionAbbrev(version) {
  return modelVersions.find((model) => model.version === version)?.tag ?? version;
}
function testHack(models) {
  try {
    if (new URL(document.location.href).searchParams.has("dtgrpctesthack")) {
      if (Array.isArray(models?.models)) {
        models.models.push({
          file: "fake_qwen.ckpt",
          version: "qwen_image",
          name: "Qwen Image Fake"
        });
        models.models.push({
          file: "fake_wan.ckpt",
          version: "wan_v2.1_14b",
          name: "Wan Fake"
        });
      }
    }
  } catch {
  }
}

// web/src/configProperties.ts
var samplers = [
  "DPM++ 2M Karras",
  "Euler A",
  "DDIM",
  "PLMS",
  "DPM++ SDE Karras",
  "UniPC",
  "LCM",
  "Euler A Substep",
  "DPM++ SDE Substep",
  "TCD",
  "Euler A Trailing",
  "DPM++ SDE Trailing",
  "DPM++ 2M AYS",
  "Euler A AYS",
  "DPM++ SDE AYS",
  "DPM++ 2M Trailing",
  "DDIM Trailing",
  "UniPC Trailing",
  "UniPC AYS",
  "TCD Trailing"
];
var seedModes = ["Legacy", "TorchCpuCompatible", "ScaleAlike", "NvidiaGpuCompatible"];
function calcShift(h, w) {
  const step1 = h * w / 256;
  const step2 = (1.15 - 0.5) / (4096 - 256);
  const step3 = (step1 - 256) * step2;
  const step4 = step3 + 0.5;
  const result = Math.exp(step4);
  return Math.round(result * 100) / 100;
}
var numFramesMaxMap = { "wan_v2.1_1.3b": 129, "wan_v2.1_14b": 129, hunyuan_video: 201, svd_i2v: 25, ltx2: 249, "ltx2.3": 249, "ltx2_3": 249 };
var numFramesDefMap = { "wan_v2.1_1.3b": 81, "wan_v2.1_14b": 81, hunyuan_video: 129, svd_i2v: 14, ltx2: 121, "ltx2.3": 121, "ltx2_3": 121 };
var propertyData = [
  ["start_width", "width", "DrawThingsSampler", "width", "int", 512, 128, 8192, 64, "roundTo64"],
  ["start_height", "height", "DrawThingsSampler", "height", "int", 512, 128, 8192, 64, "roundTo64"],
  ["seed", "seed", "DrawThingsSampler", "seed", "int", -1, -1, null, 1, "modulo=4294967295"],
  ["steps", "steps", "DrawThingsSampler", "steps", "int", 16, 1, 150, 1],
  ["guidance_scale", "cfg", "DrawThingsSampler", "guidanceScale", "float", 5, 0, 50, 0.1],
  ["strength", "strength", "DrawThingsSampler", "strength", "float", 1, 0, 1, 0.01],
  ["model", "model", "DrawThingsSampler", "model", "DT_MODEL", null],
  ["sampler", "sampler_name", "DrawThingsSampler", "sampler", "index", 0, samplers],
  ["batch_count", "batch_count", "DrawThingsSampler", "batchCount", "int", 1, 1, 1, 1],
  ["batch_size", "batch_size", "DrawThingsSampler", "batchSize", "int", 1, 1, 4, 1],
  ["hires_fix", "high_res_fix", "DrawThingsSampler", "hiresFix", "bool", false],
  ["hires_fix_start_width", "high_res_fix_start_width", "DrawThingsSampler", "hiresFixWidth", "int", 512, 128, 2048, 64, "roundTo64,ifTrue=hiresFix"],
  ["hires_fix_start_height", "high_res_fix_start_height", "DrawThingsSampler", "hiresFixHeight", "int", 512, 128, 2048, 64, "roundTo64,ifTrue=hiresFix"],
  ["hires_fix_strength", "high_res_fix_strength", "DrawThingsSampler", "hiresFixStrength", "float", 0.7, 0, 1, 0.01, "ifTrue=hiresFix"],
  ["image_guidance_scale", "image_guidance_scale", "DrawThingsSampler", "imageGuidanceScale", "float", 5, 0, 50, 0.1],
  ["seed_mode", "seed_mode", "DrawThingsSampler", "seedMode", "index", 2, seedModes],
  ["clip_skip", "clip_skip", "DrawThingsSampler", "clipSkip", "int", 1, 1, 23, 1],
  ["controls", null, "DrawThingsControlNet", "controls"],
  ["loras", null, "DrawThingsLoRA", "loras"],
  ["mask_blur", "mask_blur", "DrawThingsSampler", "maskBlur", "float", 2.5, 0, 15, 0.1],
  ["face_restoration", null, null, "faceRestoration"],
  ["decode_with_attention", null, null],
  ["hires_fix_decode_with_attention", null, null],
  ["clip_weight", null, null],
  ["negative_prompt_for_image_prior", null, null],
  ["image_prior_steps", null, null],
  ["original_image_height", null, null, "originalImageHeight"],
  ["original_image_width", null, null, "originalImageWidth"],
  ["crop_top", null, null, "cropTop"],
  ["crop_left", null, null, "cropLeft"],
  ["target_image_height", null, null, "targetImageHeight"],
  ["target_image_width", null, null, "targetImageWidth"],
  ["aesthetic_score", null, null, "aestheticScore"],
  ["negative_aesthetic_score", null, null, "negativeAestheticScore"],
  ["zero_negative_prompt", null, null, "zeroNegativePrompt"],
  ["negative_original_image_height", null, null, "negativeOriginalImageHeight"],
  ["negative_original_image_width", null, null, "negativeOriginalImageWidth"],
  ["name", null, null, null],
  ["fps_id", "fps", "DrawThingsSampler", "fps", "int", 12, 1, 30, 1],
  ["motion_bucket_id", "motion_scale", "DrawThingsSampler", "motionScale", "int", 127, 0, 255, 1],
  ["cond_aug", "guiding_frame_noise", "DrawThingsSampler", "guidingFrameNoise", "float", 0.02, 0, 1, 0.01],
  ["start_frame_cfg", "start_frame_guidance", "DrawThingsSampler", "startFrameGuidance", "float", 1, 0, 15, 0.1],
  ["num_frames", "num_frames", "DrawThingsSampler", "numFrames", "int", numFramesDefMap, 1, numFramesMaxMap, 1],
  ["mask_blur_outset", "mask_blur_outset", "DrawThingsSampler", "maskBlurOutset", "float", 0, -100, 100, 0.1],
  ["sharpness", "sharpness", "DrawThingsSampler", "sharpness", "float", 0, 0, 30, 0.1],
  ["shift", "shift", "DrawThingsSampler", "shift", "float", 1, 0, 16, 0.01],
  ["stage_2_steps", null, null, "stage2Steps"],
  ["stage_2_cfg", null, null, "stage2Guidance"],
  ["stage_2_shift", null, null, "stage2Shift"],
  ["tiled_decoding", "tiled_decoding", "DrawThingsSampler", "tiledDecoding", "bool", false],
  ["decoding_tile_width", "decoding_tile_width", "DrawThingsSampler", "decodingTileWidth", "int", 512, 128, 2048, 64, "roundTo64,ifTrue=tiledDecoding"],
  ["decoding_tile_height", "decoding_tile_height", "DrawThingsSampler", "decodingTileHeight", "int", 512, 128, 2048, 64, "roundTo64,ifTrue=tiledDecoding"],
  ["decoding_tile_overlap", "decoding_tile_overlap", "DrawThingsSampler", "decodingTileOverlap", "int", 512, 64, 1024, 64, "roundTo64,ifTrue=tiledDecoding"],
  ["stochastic_sampling_gamma", "stochastic_sampling_gamma", "DrawThingsSampler", "stochasticSamplingGamma", "float", 0.3, 0, 1, 0.01],
  ["preserve_original_after_inpaint", "preserve_original", "DrawThingsSampler", "preserveOriginalAfterInpaint", "bool", true],
  ["tiled_diffusion", "tiled_diffusion", "DrawThingsSampler", "tiledDiffusion", "bool", false],
  ["diffusion_tile_width", "diffusion_tile_width", "DrawThingsSampler", "diffusionTileWidth", "int", 512, 128, 2048, 64, "roundTo64,ifTrue=tiledDiffusion"],
  ["diffusion_tile_height", "diffusion_tile_height", "DrawThingsSampler", "diffusionTileHeight", "int", 512, 128, 2048, 64, "roundTo64,ifTrue=tiledDiffusion"],
  ["diffusion_tile_overlap", "diffusion_tile_overlap", "DrawThingsSampler", "diffusionTileOverlap", "int", 512, 64, 1024, 64, "roundTo64,ifTrue=tiledDiffusion"],
  ["t5_text_encoder", null, null, "t5TextEncoder"],
  ["separate_clip_l", "separate_clip_l", "DrawThingsSampler", "separateClipL", "bool", false],
  ["clip_l_text", "clip_l_text", "DrawThingsSampler", "clipLText", "string", "", "ifTrue=separateClipL"],
  ["separate_open_clip_g", "separate_open_clip_g", "DrawThingsSampler", "separateOpenClipG", "bool", false],
  ["open_clip_g_text", "open_clip_g_text", "DrawThingsSampler", "openClipGText", "string", "", "ifTrue=separateOpenClipG"],
  ["speed_up_with_guidance_embed", "speed_up", "DrawThingsSampler", "speedUpWithGuidanceEmbed", "bool", true],
  ["guidance_embed", "guidance_embed", "DrawThingsSampler", "guidanceEmbed", "float", 4.5, 0, 50, 0.1, "ifFalse=speedUpWithGuidanceEmbed"],
  ["resolution_dependent_shift", "res_dpt_shift", "DrawThingsSampler", "resolutionDependentShift", "bool", true],
  ["tea_cache_start", "tea_cache_start", "DrawThingsSampler", "teaCacheStart", "int", 5, 0, 150, 1, "ifTrue=teaCache"],
  ["tea_cache_end", "tea_cache_end", "DrawThingsSampler", "teaCacheEnd", "int", -1, -151, 150, 1, "ifTrue=teaCache"],
  ["tea_cache_threshold", "tea_cache_threshold", "DrawThingsSampler", "teaCacheThreshold", "float", 0.06, 0, 1, 0.01, "ifTrue=teaCache"],
  ["tea_cache", "tea_cache", "DrawThingsSampler", "teaCache", "bool", false],
  ["separate_t5", null, null, "separateT5"],
  ["t5_text", null, null, null],
  ["tea_cache_max_skip_steps", "tea_cache_max_skip_steps", "DrawThingsSampler", "teaCacheMaxSkipSteps", "int", 3, 1, 50, 1, "ifTrue=teaCache"],
  // causal_inference_enabled is implied by causal_inference>0
  ["causal_inference_enabled", null, null, null],
  ["causal_inference", "causal_inference", "DrawThingsSampler", "causalInference", "int", 0, 0, 129, 4, "ifPos=set(causalInference, true),causInfConvert"],
  ["causal_inference_pad", "causal_inference_pad", "DrawThingsSampler", "causalInferencePad", "int", 0, 0, 129, 4, "causInfConvert"],
  // in upscaler node
  ["upscaler", "upscaler_model", "DrawThingsUpscaler", "upscaler"],
  ["upscaler_scale_factor", "upscaler_scale_factor", "DrawThingsUpscaler", "upscalerScaleFactor", "int", 4, 2, 4, 2],
  // in refiner node
  ["refiner_model", "refiner_model", "DrawThingsRefiner", "refinerModel"],
  ["refiner_start", "refiner_start", "DrawThingsRefiner", "refinerStart", "int", 0.85, 0, 1, 0.01],
  ["cfg_zero_star", "cfg_zero_star", "DrawThingsSampler", "cfgZeroStar", "bool", false],
  ["cfg_zero_star_init_steps", "cfg_zero_star_init_steps", "DrawThingsSampler", "cfgZeroInitSteps", "int", 0, 0, "ref=steps", 1, "ifTrue=cfgZeroStar"]
];
function roundBy64(value) {
  return Math.round(value / 64) * 64;
}
var importers = {
  model: async (k, v, w, n) => {
    await modelService.selectByFile(n, w, v);
  },
  refiner_model: async (k, v, w, n) => {
    await modelService.selectByFile(n, w, v);
  },
  upscaler: async (k, v, w, n) => {
    await modelService.selectByFile(n, w, v);
  },
  start_width: (k, v, w) => {
    if (w) w.value = roundBy64(v);
  },
  start_height: (k, v, w) => {
    if (w) w.value = roundBy64(v);
  },
  sampler: (k, v, w) => {
    w.value = samplers[v];
  },
  seed: (k, v, w, n) => {
    if (typeof v === "number" && v >= 0) {
      w.value = v;
    }
  },
  hires_fix_start_width: (k, v, w, n, c) => {
    if (!c.hiresFix) return;
    if (w) w.value = roundBy64(v);
  },
  hires_fix_start_height: (k, v, w, n, c) => {
    if (!c.hiresFix) return;
    if (w) w.value = roundBy64(v);
  },
  hires_fix_strength: (k, v, w, n, c) => {
    if (!c.hiresFix) return;
    if (w) w.value = v;
  },
  seed_mode: (k, v, w) => {
    if (w && seedModes[v]) w.value = seedModes[v];
  },
  decoding_tile_width: (k, v, w, n, c) => {
    if (!c.tiledDecoding) return;
    if (w) w.value = roundBy64(v);
  },
  decoding_tile_height: (k, v, w, n, c) => {
    if (!c.tiledDecoding) return;
    if (w) w.value = roundBy64(v);
  },
  decoding_tile_overlap: (k, v, w, n, c) => {
    if (!c.tiledDecoding) return;
    if (w) w.value = roundBy64(v);
  },
  diffusion_tile_width: (k, v, w, n, c) => {
    if (!c.tiledDiffusion) return;
    if (w) w.value = roundBy64(v);
  },
  diffusion_tile_height: (k, v, w, n, c) => {
    if (!c.tiledDiffusion) return;
    if (w) w.value = roundBy64(v);
  },
  diffusion_tile_overlap: (k, v, w, n, c) => {
    if (!c.tiledDiffusion) return;
    if (w) w.value = roundBy64(v);
  },
  guidance_embed: (k, v, w, n, c) => {
    if (w) w.value = v;
  },
  resolution_dependent_shift: (k, v, w, n, c) => {
    if (w) w.value = v;
    if (v) {
      const shiftWidget = n.widgets?.find((w2) => w2.name === "shift");
      const width = c.width || n.widgets?.find((w2) => w2.name === "width")?.value;
      const height = c.height || n.widgets?.find((w2) => w2.name === "height")?.value;
      if (shiftWidget && width && height) shiftWidget.value = calcShift(width, height);
    }
  },
  causal_inference: function(k, v, w, n, c) {
    if (Number.isFinite(v)) w.value = v * 4 - 3;
    else w.value = 0;
  },
  causal_inference_pad: (k, v, w, n, c) => {
    if (w && typeof v === "number") w.value = v * 4;
  },
  // since upscaler and refiner live in different nodes, it's easier to do
  // coercion in the import function
  upscaler_scale_factor: (k, v, w) => {
    if (v === 2) w.value = 2;
    else w.value = 4;
  },
  refiner_start: (k, v, w) => {
    if (typeof v === "number")
      w.value = Math.min(1, Math.max(0, v));
    else
      w.value = 0.85;
  }
};
var exporters = {
  // start_width: {},
  // start_height: {},
  model: async (w, n, c) => {
    const val = w.value;
    if (w && val && val.value) c.model = val.value.file ?? val.value.name;
  },
  sampler: (w, n, c) => {
    if (w && typeof w.value === "string") c.sampler = samplers.indexOf(w.value);
  },
  // hires_fix_start_width: {},
  // hires_fix_start_height: {},
  seed_mode: (w, n, c) => {
    if (w && typeof w.value === "string") c.seed_mode = seedModes.indexOf(w.value);
  },
  // decoding_tile_width: {},
  // decoding_tile_height: {},
  // decoding_tile_overlap: {},
  // diffusion_tile_width: {},
  // diffusion_tile_height: {},
  // diffusion_tile_overlap: {},
  // guidance_embed: (w, n, c) => {
  // },
  // resolution_dependent_shift: (w, n, c) => {
  // },
  // shift: (w, n, c) => {
  // },
  causal_inference: (w, n, c) => {
    if (w && typeof w.value === "number") c.causal_inference = Math.floor((w.value + 3) / 4);
  }
};
var DTProperty = class {
  constructor(fbs, python, node, json, type, defaultValue, ...rest) {
    this.customImport = void 0;
    this.customExport = void 0;
    this.fbs = fbs;
    this.python = python;
    this.node = node;
    this.json = json;
    this.type = type;
    this.defaultValue = defaultValue;
    if (type === "int" || type === "float") {
      this.min = rest[0];
      this.max = rest[1];
      this.step = rest[2];
      this.spec = rest[3];
    }
    if (type === "bool") {
      this.spec = rest[0];
    }
    if (type === "index") {
      this.values = rest[0];
      this.spec = rest[1];
    }
    if (type === "string") {
      this.spec = rest[0];
    }
  }
  async import(jsonKey, jsonValue, widget, node, config) {
    if (!widget || !node) return;
    if (this.customImport) await this.customImport(jsonKey, jsonValue, widget, node, config);
    else {
      widget.value = jsonValue ?? this.defaultValue;
    }
  }
  async export(widget, node, config) {
    if (this.customExport) await this.customExport(widget, node, config);
    else {
      if (this.json && widget && widget.value !== void 0) config[this.json] = widget.value;
    }
  }
  coerce(value) {
    if (this.type === "int" || this.type === "float") {
      if (typeof value !== "number") return this.defaultValue || 0;
      if (typeof this.min === "number" && Number.isFinite(this.min) && value < this.min) return this.min;
      if (typeof this.max === "number" && Number.isFinite(this.max) && value > this.max) return this.max;
      return this.type === "int" ? Math.round(value) : value;
    }
    if (this.type === "bool") {
      if (typeof value !== "boolean") return this.defaultValue || false;
      return value;
    }
    if (this.type === "string") {
      if (typeof value !== "string") return this.defaultValue || "";
      return value;
    }
    if (this.type === "index") {
      if (typeof value === "number" && value >= 0 && this.values && value < this.values.length) return this.values[value];
      if (typeof value === "string" && this.values && this.values.includes(value)) return value;
      return this.values ? this.values[this.defaultValue] : void 0;
    }
    return value;
  }
  getRequiredNodes(value, config) {
    if (this.node) return [this.node];
    return [];
  }
};
var properties = propertyData.map(([fbs, ...rest]) => {
  const prop = new DTProperty(fbs, ...rest);
  prop.customImport = importers[fbs];
  prop.customExport = exporters[fbs];
  return prop;
});
function findPropertyJson(name) {
  return properties.find((p) => p.json === name);
}
function findPropertyPython(name) {
  return properties.find((p) => p.python === name);
}
function findPropertiesByNode(nodeType) {
  return properties.filter((p) => p.node === nodeType);
}
patchProp("loras", "getRequiredNodes", (value) => {
  if (Array.isArray(value) && value.length > 0)
    return Array(Math.ceil(value.length / 8)).fill("DrawThingsLoRA");
  else
    return [];
});
patchProp("controls", "getRequiredNodes", (value) => {
  if (Array.isArray(value))
    return value.map((_) => "DrawThingsControlNet");
  else
    return [];
});
patchProp("upscaler", "getRequiredNodes", (value) => {
  if (value)
    return ["DrawThingsUpscaler"];
  return [];
});
patchProp("upscaler_scale_factor", "getRequiredNodes", () => []);
patchProp("refinerModel", "getRequiredNodes", (value) => {
  if (value)
    return ["DrawThingsRefiner"];
  return [];
});
patchProp("refinerStart", "getRequiredNodes", () => []);
function patchProp(jsonName, funcName, func) {
  const prop = findPropertyJson(jsonName);
  if (prop)
    prop[funcName] = func;
}

// web/src/configImport.ts
async function importConfig(sampler) {
  return navigator.clipboard.readText().then(async (text) => {
    try {
      const config = JSON.parse(text);
      const requiredNodes = [];
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
        await prop.import(k, v, widget, sampler, config);
      }
      sampler.coerceWidgetValues();
      sampler.updateDynamicWidgets?.();
      const availableNodes = sampler.getConfigInputNodes();
      const missingNodes = [];
      if (requiredNodes.includes("DrawThingsUpscaler")) {
        if (!availableNodes.DrawThingsUpscaler.length)
          missingNodes.push("DrawThingsUpscaler");
        else
          await applyConfig(
            availableNodes.DrawThingsUpscaler[0],
            config
          );
      }
      if (requiredNodes.includes("DrawThingsRefiner")) {
        if (!availableNodes.DrawThingsRefiner.length)
          missingNodes.push("DrawThingsRefiner");
        else
          await applyConfig(
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
            `${cnetNeeded - availableNodes.DrawThingsControlNet.length} x DrawThingsControlNet`
          );
        let controlIndex = 0;
        for (const cnetNode of availableNodes.DrawThingsControlNet) {
          await applyCnetConfig(
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
            `${loraNeeded - availableNodes.DrawThingsLoRA.length} x DrawThingsLoRA`
          );
        await applyLoraConfig(
          availableNodes.DrawThingsLoRA,
          config.loras
        );
      }
      if (missingNodes.length) {
        getApp().extensionManager.toast.add({
          severity: "warn",
          summary: "Draw Things gRPC",
          detail: [
            "The Draw Things config has been partially loaded. To load the full config, add the following nodes:\n",
            ...missingNodes.map((n) => `\u2022 ${n}`)
          ].join("\n"),
          life: 8e3
        });
      }
    } catch (e) {
      alert(
        `Failed to parse Draw Things config from clipboard

${e}`
      );
      console.warn(e);
    }
  });
}
async function applyConfig(node, config) {
  const nodeProps = findPropertiesByNode(node.type);
  for (const nodeProp of nodeProps) {
    const widget = node.widgets?.find((w) => w.name === nodeProp.python);
    if (!widget || !nodeProp.json) continue;
    await nodeProp.import(
      nodeProp.json,
      config[nodeProp.json],
      widget,
      node,
      config
    );
  }
}
async function applyCnetConfig(node, controlConfig) {
  if (!controlConfig) return;
  const widgets = node.widgets?.reduce((acc, w) => {
    acc[w.name] = w;
    return acc;
  }, {}) ?? {};
  if ("file" in controlConfig) {
    await modelService.selectByFile(node, widgets.control_name, controlConfig.file);
  }
  if ("globalAveragePooling" in controlConfig)
    widgets.global_average_pooling.value = !!controlConfig.globalAveragePooling;
  if ("weight" in controlConfig && typeof controlConfig.weight === "number")
    widgets.control_weight.value = Math.min(
      Math.max(controlConfig.weight, 0),
      1.5
    );
  else widgets.control_weight.value = 1;
  if ("guidanceStart" in controlConfig && typeof controlConfig.guidanceStart === "number")
    widgets.control_start.value = Math.min(
      Math.max(controlConfig.guidanceStart, 0),
      1
    );
  else widgets.control_start.value = 0;
  if ("guidanceEnd" in controlConfig && typeof controlConfig.guidanceEnd === "number")
    widgets.control_end.value = Math.min(
      Math.max(controlConfig.guidanceEnd, 0),
      1
    );
  else widgets.control_end.value = 1;
  if ("downSamplingRate" in controlConfig && typeof controlConfig.downSamplingRate === "number")
    widgets.down_sampling_rate.value = controlConfig.downSamplingRate;
  else widgets.down_sampling_rate.value = 1;
  if ("inputOverride" in controlConfig && typeof controlConfig.inputOverride === "string") {
    const capitalized = controlConfig.inputOverride.charAt(0).toUpperCase() + controlConfig.inputOverride.slice(1);
    const options = widgets.control_input_type?.options;
    if (options?.values?.includes(capitalized))
      widgets.control_input_type.value = capitalized;
    else widgets.control_input_type.value = "Unspecified";
  } else widgets.control_input_type.value = "Unspecified";
  if ("controlImportance" in controlConfig && typeof controlConfig.controlImportance === "string") {
    const capitalized = controlConfig.controlImportance.charAt(0).toUpperCase() + controlConfig.controlImportance.slice(1);
    const options = widgets.control_mode?.options;
    if (options?.values?.includes(capitalized))
      widgets.control_mode.value = capitalized;
    else widgets.control_mode.value = "Balanced";
  } else widgets.control_mode.value = "Balanced";
  if ("targetBlocks" in controlConfig && Array.isArray(controlConfig.targetBlocks)) {
    if (controlConfig.targetBlocks.length === 0)
      widgets.target_blocks.value = "All";
    if (controlConfig.targetBlocks.length === 1)
      widgets.target_blocks.value = "Style";
    if (controlConfig.targetBlocks.length > 1)
      widgets.target_blocks.value = "Style and Layout";
  } else widgets.target_blocks.value = "All";
}
async function applyLoraConfig(nodes, loraConfig) {
  for (let iNode = 0; iNode < nodes.length; iNode++) {
    const node = nodes[iNode];
    const lastIndex = iNode * 8 + 8;
    if (loraConfig.length > lastIndex) node.loraCount = 8;
    else node.loraCount = 8 - (lastIndex - loraConfig.length);
    for (let iSlot = 0; iSlot < 8; iSlot++) {
      const lc = loraConfig[iSlot + iNode * 8];
      const { file, weight, mode } = getLoraSlotWidgets(node, iSlot);
      if (!lc?.file) {
        setModelValue(node, file, "(None selected)");
        weight.value = 1;
        mode.value = "All";
        continue;
      }
      await modelService.selectByFile(node, file, lc.file);
      if ("weight" in lc && typeof lc.weight === "number")
        weight.value = Math.min(Math.max(lc.weight, -5), 5);
      else weight.value = 1;
      if ("mode" in lc && typeof lc.mode === "string") {
        const capitalized = lc.mode.charAt(0).toUpperCase() + lc.mode.slice(1);
        const options = mode?.options;
        if (options?.values?.includes(capitalized))
          mode.value = capitalized;
        else mode.value = "All";
      } else mode.value = "All";
    }
  }
}
function getLoraSlotWidgets(node, loraIndex) {
  const widgets = node.widgets?.slice(loraIndex * 3 + 1, loraIndex * 3 + 4) ?? [];
  return {
    file: widgets[0],
    weight: widgets[1],
    mode: widgets[2]
  };
}

// web/src/widgets.ts
var app = window.comfyAPI.app.app;
var basicWidgets = [
  "server",
  "port",
  "use_tls",
  // "model",
  "strength",
  "seed",
  "control_after_generate",
  "width",
  "height",
  "steps",
  "cfg",
  "sampler_name",
  "res_dpt_shift",
  "shift",
  "batch_size",
  "num_frames"
];
var advancedWidgets = [
  "seed_mode",
  "speed_up",
  "guidance_embed",
  "fps",
  "motion_scale",
  "guiding_frame_noise",
  "start_frame_guidance",
  "causal_inference",
  "causal_inference_pad",
  // zero neg
  // sep clip
  "clip_skip",
  "sharpness",
  "mask_blur",
  "mask_blur_outset",
  "preserve_original",
  "separate_clip_l",
  "clip_l_text",
  "separate_open_clip_g",
  "open_clip_g_text",
  "high_res_fix",
  "high_res_fix_start_width",
  "high_res_fix_start_height",
  "high_res_fix_strength",
  "upscaler",
  "image_guidance_scale",
  "tiled_decoding",
  "decoding_tile_width",
  "decoding_tile_height",
  "decoding_tile_overlap",
  "tiled_diffusion",
  "diffusion_tile_width",
  "diffusion_tile_height",
  "diffusion_tile_overlap",
  "tea_cache",
  "tea_cache_start",
  "tea_cache_end",
  "tea_cache_threshold",
  "tea_cache_max_skip_steps",
  "color_calibration"
];
var origProps = {};
function updateInput(input, node) {
  if (!input || !input.widget || !node || !node.getWidgetFromSlot) return;
  if (input._origPos === void 0) {
    input._origPos = input.pos;
    const widget = node.getWidgetFromSlot(input);
    Object.defineProperty(input, "pos", {
      get() {
        if (widget.hidden) {
          return this.collapsedPos;
        } else {
          return input._origPos;
        }
      },
      set(value) {
        input._origPos = value;
      }
    });
  }
}
function showWidget(node, widgetName, show = false, suffix = "") {
  const widget = findWidgetByName(node, widgetName);
  if (!widget) return;
  if (!origProps[widget.name]) {
    origProps[widget.name] = {
      // origType: widget.type,
      origComputeSize: widget.computeSize,
      origComputedHeight: widget.computedHeight
    };
  }
  const isVisible = !widget.hidden;
  if (isVisible === show) return;
  widget.computeSize = show ? origProps[widget.name].origComputeSize : () => [0, -4];
  widget.computedHeight = show ? origProps[widget.name].origComputedHeight : 0;
  widget.hidden = !show;
  widget.linkedWidgets?.forEach((w) => showWidget(node, w, show, ":" + widget.name));
  const minHeight = node.computeSize()[1];
  if (minHeight > node.size[1]) node.setSize([node.size[0], minHeight]);
  if (app.extensionManager.setting.get("drawthings.node.keep_shrunk") && minHeight < node.size[1])
    node.setSize([node.size[0], minHeight]);
  setTimeout(() => app.canvas.setDirty(true, true), 10);
}
function showWidgets(node, show, ...widgetNames) {
  widgetNames.forEach((w) => showWidget(node, w, show));
}
function updateSamplerWidgets(node) {
  const selectedModel = findWidgetByName(node, "model")?.value;
  const version = selectedModel?.value?.version ?? node?._lastSelectedModel?.model?.value?.version;
  const features = modelVersions.find((model) => model.version === version)?.features ?? [];
  const settings = findWidgetByName(node, "settings")?.value;
  const isBasic = settings === "Basic" || settings === "All";
  const isAdvanced = settings === "Advanced" || settings === "All";
  showWidgets(node, isBasic, ...basicWidgets);
  showWidgets(node, isAdvanced, ...advancedWidgets);
  if (isBasic) {
    const isTcd = findWidgetByName(node, "sampler_name")?.value?.toString().startsWith("TCD");
    showWidget(node, "stochastic_sampling_gamma", isTcd);
    const resDPTShiftAvailable = features.includes("resolutionDependentShift");
    showWidget(node, "res_dpt_shift", resDPTShiftAvailable);
    const shiftDisabled = resDPTShiftAvailable && findWidgetByName(node, "res_dpt_shift")?.value;
    const shiftWidget = findWidgetByName(node, "shift");
    if (shiftWidget) shiftWidget.disabled = shiftDisabled;
    const isVideo = features.includes("numFrames");
    showWidget(node, "num_frames", isVideo);
    const zeroCfgAvailable = features.includes("cfgZero");
    const zeroCfgEnabled = zeroCfgAvailable && findWidgetByName(node, "cfg_zero_star")?.value;
    showWidget(node, "cfg_zero_star", zeroCfgAvailable);
    showWidget(node, "cfg_zero_star_init_steps", !!zeroCfgEnabled);
  }
  if (isAdvanced) {
    const teaCacheAvailable = features.includes("teaCache");
    const teaCacheEnabled = teaCacheAvailable && findWidgetByName(node, "tea_cache")?.value;
    showWidget(node, "tea_cache", teaCacheAvailable);
    showWidgets(
      node,
      !!teaCacheEnabled,
      "tea_cache_start",
      "tea_cache_end",
      "tea_cache_threshold",
      "tea_cache_max_skip_steps"
    );
    const speedUpAvailable = features.includes("guidanceEmbed");
    showWidget(node, "speed_up", speedUpAvailable);
    const speedUpEnabled = findWidgetByName(node, "speed_up")?.value;
    showWidget(node, "guidance_embed", speedUpAvailable && !speedUpEnabled);
    const separateClipLAvailable = features.includes("separateClipL");
    showWidget(node, "separate_clip_l", separateClipLAvailable);
    const separateClipLEnabled = separateClipLAvailable && findWidgetByName(node, "separate_clip_l")?.value;
    showWidget(node, "clip_l_text", !!separateClipLEnabled);
    const separateOpenClipGAvailable = features.includes("separateOpenClipG");
    showWidget(node, "separate_open_clip_g", separateOpenClipGAvailable);
    const separateOpenClipGEnabled = separateOpenClipGAvailable && findWidgetByName(node, "separate_open_clip_g")?.value;
    showWidget(node, "open_clip_g_text", !!separateOpenClipGEnabled);
    const isSvd = features.includes("svdOptions");
    showWidgets(node, isSvd, "fps", "motion_scale", "guiding_frame_noise", "start_frame_guidance");
    const causalInferenceAvailable = features.includes("causalInference");
    showWidget(node, "causal_inference", causalInferenceAvailable);
    showWidget(node, "causal_inference_pad", causalInferenceAvailable);
    const hiResFixEnabled = findWidgetByName(node, "high_res_fix")?.value;
    showWidgets(
      node,
      !!hiResFixEnabled,
      "high_res_fix_start_width",
      "high_res_fix_start_height",
      "high_res_fix_strength"
    );
    const tiledDecodingEnabled = findWidgetByName(node, "tiled_decoding")?.value;
    showWidgets(node, !!tiledDecodingEnabled, "decoding_tile_width", "decoding_tile_height", "decoding_tile_overlap");
    const tiledDiffusionEnabled = findWidgetByName(node, "tiled_diffusion")?.value;
    showWidgets(
      node,
      !!tiledDiffusionEnabled,
      "diffusion_tile_width",
      "diffusion_tile_height",
      "diffusion_tile_overlap"
    );
  }
}
var extension = {
  name: "widgets",
  settings: [
    {
      id: "drawthings.node.keep_shrunk",
      type: "boolean",
      name: "Keep node shrunk when widgets change",
      defaultValue: true,
      category: ["Draw Things", "Nodes", "Keep node shrunk"],
      onChange: (newVal, oldVal) => {
        if (oldVal === false && newVal === true) {
          app.graph.nodes.filter((n) => n.type === "DrawThingsSampler").forEach((n) => {
            setTimeout(() => n.updateDynamicWidgets(), 10);
          });
        }
      }
    }
  ],
  async beforeRegisterNodeDef(nodeType, nodeData, app4) {
    if (nodeType.comfyClass === "DrawThingsSampler") {
      updateProto(nodeType, samplerWidgetsProto);
    }
  }
};
var widgets_default = extension;
var samplerWidgetsProto = {
  updateDynamicWidgets() {
    updateSamplerWidgets(this);
  },
  onNodeCreated() {
    this.updateDynamicWidgets();
  },
  onConfigure(data) {
    this.updateDynamicWidgets();
  },
  onInputAdded(input) {
    if (input.widget) updateInput(input, this);
  },
  onWidgetChanged(name, value, old_Value, widget) {
    this.updateDynamicWidgets();
    if (name === "res_dpt_shift") {
      const version = this.getModelVersion();
      const features = modelVersions.find((model) => model.version === version)?.features ?? [];
      const resDPTShiftAvailable = features.includes("resolutionDependentShift");
      const resDptShiftEnabled = resDPTShiftAvailable && findWidgetByName(this, "res_dpt_shift")?.value;
      if (resDptShiftEnabled) {
        const height = findWidgetByName(this, "height")?.value;
        const width = findWidgetByName(this, "width")?.value;
        const shiftWidget = findWidgetByName(this, "shift");
        if (shiftWidget && typeof height === "number" && typeof width === "number") {
          shiftWidget.value = calcShift(height, width);
        }
      }
    }
  }
};

// web/src/lora.ts
var DEFAULT_LORA = "(None selected)";
function DtButtonsTypeHandler(node, _inputName, _inputData, _app) {
  const { container, buttons } = createButtons([
    {
      label: "Show Mode",
      callback: () => {
        node.showMode = !node.showMode;
      },
      dataTestId: "dtgrpc-lora-show-mode"
    },
    {
      label: "Less",
      callback: () => {
        node.loraCount -= 1;
      },
      dataTestId: "dtgrpc-lora-less"
    },
    {
      label: "More",
      callback: () => {
        node.loraCount += 1;
      },
      dataTestId: "dtgrpc-lora-more"
    }
  ]);
  const options = {
    hideOnZoom: false,
    getValue: () => void 0,
    setValue: (_value) => {
    },
    getMinHeight: () => 36,
    getMaxHeight: () => 36,
    getHeight: () => 36,
    margin: 4
  };
  const widget = node.addDOMWidget("buttons", "DT_BUTTONS", container, options);
  widget._buttonElements = buttons;
  widget.value = null;
  return { widget };
}
var loraProto = {
  onNodeCreated(_graph) {
    this.loraCount = 1;
    this.showMode = false;
  },
  onConfigure(serialised) {
    if ("loraCount" in serialised) this.loraCount = serialised.loraCount;
    if ("showMode" in serialised) this.showMode = serialised.showMode;
    if (serialised.widget_values_keyed && this.widgets) {
      for (const [name, value] of Object.entries(serialised.widget_values_keyed)) {
        const widget = this.widgets.find((w) => w.name === name);
        if (widget) widget.value = value;
      }
    } else if (serialised.widgets_values && serialised.widgets_values.length === 2 && this.widgets) {
      this.widgets[0].value = null;
      const modelWidget = this.widgets.find((w) => w.name === "lora");
      if (modelWidget) modelWidget.value = serialised.widgets_values[0];
      const weightWidget = this.widgets.find((w) => w.name === "weight");
      if (weightWidget) weightWidget.value = serialised.widgets_values[1];
      const inputs = this.inputs.map((input, slot) => ({ slot, input })).filter(({ input }) => input.link !== null);
      const inputNodes = inputs.map(({ input, slot }) => ({ node: this.getInputNode(slot), input, slot }));
      for (const { node, input, slot } of inputNodes) {
        if (node && node.type === "DrawThingsLoRA" && input.link !== null) {
          this.disconnectInput(slot);
          this.graph?.removeLink(input.link);
          const connectNode = node.connect;
          connectNode.call(node, 0, this, 0);
        } else if (input.link !== null) {
          this.disconnectInput(slot);
          this.graph?.removeLink(input.link);
        }
      }
      const imageInput = this.inputs.findIndex((input) => input.name === "control_image");
      if (imageInput !== -1) this.removeInput(imageInput);
    }
    for (const widget of this.widgets ?? []) {
      if ("model_type" in widget && !widget.value) widget.value = DEFAULT_LORA;
    }
    delete this.widget_values_keyed;
    restoreModelSelections(this);
  },
  onSerialize(serialised) {
    serialised.loraCount = this._loraCount;
    serialised.showMode = this._showMode;
    serialised.nodePackVersion = nodePackVersion;
    if (this.widgets) {
      serialised.widget_values_keyed = plainWidgetValues(this);
    }
  },
  loraCount: {
    get() {
      return this._loraCount;
    },
    set(count) {
      if (this._loraCount === count) return;
      this._loraCount = Math.max(0, Math.min(count, 8));
      this.updateWidgets();
      const buttons = this.widgets?.[0]?._buttonElements;
      if (buttons) {
        buttons[1].disabled = this._loraCount <= 1;
        buttons[2].disabled = this._loraCount >= 8;
      }
    },
    enumerable: true
  },
  showMode: {
    get() {
      return this._showMode;
    },
    set(value) {
      if (this._showMode === value) return;
      this._showMode = value;
      this.updateWidgets();
      const buttons = this.widgets?.[0]?._buttonElements;
      if (buttons) {
        buttons[0].textContent = value ? "Hide Mode" : "Show Mode";
      }
    },
    enumerable: true
  },
  updateWidgets() {
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
          this.widgets[modelIndex].value = DEFAULT_LORA;
        }
      } else {
        showWidget(this, this.widgets[modelIndex].name, false);
        showWidget(this, this.widgets[weightIndex].name, false);
        showWidget(this, this.widgets[modeIndex].name, false);
        this.widgets[modelIndex].value = DEFAULT_LORA;
      }
    }
  }
};
var extension2 = {
  name: "loraNode",
  beforeRegisterNodeDef(nodeType, _nodeData, _app) {
    if (nodeType.comfyClass === "DrawThingsLoRA") {
      updateProto(nodeType, loraProto);
    }
  }
};
var lora_default = extension2;
function createButtons(buttonsDefs) {
  const container = document.createElement("div");
  container.classList.add("dt-buttons-container");
  const buttons = [];
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
var dataPath = "./draw-things-comfyui/data.json";
async function checkVersion() {
  const announced = await getAnnounced();
  const latestAnnouncement = announcements[announcements.length - 1];
  if (!announced.includes(latestAnnouncement.version)) {
    await saveAnnounced(latestAnnouncement.version);
    app$1.extensionManager.toast.add({
      summary: latestAnnouncement.title,
      detail: latestAnnouncement.detail,
      severity: "success",
      life: 0
    });
  }
}
async function getAnnounced() {
  const data = await getUserData();
  return data?.announced ?? [];
}
async function saveAnnounced(version) {
  const data = await getUserData();
  if (!data?.announced || !Array.isArray(data?.announced))
    data.announced = [];
  data.announced.push(version);
  await app$1.api.storeUserData(dataPath, data);
}
async function getUserData() {
  try {
    const response = await app$1.api.getUserData(dataPath);
    if (response.status === 200) {
      const data2 = await response.json();
      return data2;
    }
  } catch (error) {
    console.error(`Error getting user data: ${error}`);
  }
  const data = {
    announced: []
  };
  return data;
}
var announcements = [
  {
    version: "1.6.0",
    title: "DrawThings-gRPC 1.6.0",
    detail: [
      `The Draw Things Sampler has a new input and corresponding node: Hints!`,
      `Hints are Draw Thing's control images, used by ControlNets, Flux Kontext,`,
      `Hi-Dream E1 and a handful of LoRAs. Use this node to add references images,`,
      `like the "Moodboard" in the Draw Things App.`,
      `

For ControlNets, images can be added with either the ControlNet node,`,
      `or with the Hints node.  For LoRAs (like Flux Depth), use the Hints node with the`,
      `appropriate hint type. For Flux Kontext or Hi-Dream E1, use the Hints node with`,
      `"Shuffle (Moodboard)" as the hint type.`,
      `

Note: Currently pose or scribble images are not working correctly, but depth or`,
      `moodboard images should work as expected.`
    ].join(" ")
  },
  {
    version: "1.7.0",
    title: "DrawThings-gRPC 1.7.0",
    detail: [
      `\u2022 Response compression is now supported! It's no longer necessary to disable this option in Draw Things or the gRPC CLI.`,
      `\u2022 Added hi res fix support for hint images`,
      `\u2022 Add support for pose hint images`,
      `\u2022 Fix: Model widgets should no longer show[object Object] when loading a workflow while disconnected`,
      `\u2022 Fix: The Draw Things Sampler Node now shows the correct error when running a workflow while not connected.`,
      `\u2022 Fix: Hint images are provided in both sizes when HiResFix is enabled`,
      `\u2022 Fix: When loading a workflow while disconnected, the widgets for the last selected model version will be shown.`,
      `\u2022 Fix: Update notes messages should only appear once`
    ].join("\n")
  },
  {
    version: "1.8.0",
    title: "DrawThings-gRPC 1.8.0",
    detail: `- Bridge Mode support: For DT+ subscribers interested in using Bridge Mode, you can now list all official, community, and uncurated models available in Cloud Compute. Right click the sampler node, or go to the Draw Things tab in Settings, to enable. Make sure to enable Bridge Mode in the API settings of your Draw Things app (only available for DT+ subscribers). (User uploaded loras are currently unsupported.)
- Note: We have no way of knowing if bridge mode is enabled from ComfyUI. Enabling bridge mode in Comfy simply changes the list of models that are shown - it's up to your DT app or CLI how to handle the request.
- Draw Things config import has been improved. Configs that use additional nodes (LoRA, ControlNet, Upscaler, or Refiner) will apply their values to existing, connected nodes. If the node isn't available, a message will be displayed listing the missing nodes.`
  },
  {
    version: "1.9.0",
    title: "Draw Things for ComfyUI 1.9.0",
    detail: [
      "Thank you for installing the Official Draw Things extension for ComfyUI! If you are switching form the original DrawThings-gRPC extension, please make sure the old version is uninstalled.",
      "\n",
      "\u2022 There is now a separate option to enable/disable previews. You can find this in the ComfyUI settings or by right clicking the sampler node.",
      "\u2022 The list of models for bridge mode will now be updated when the extension is loaded. If the models list is empty, wait a few seconds and check again.",
      "\n",
      "Note: Nodes 2.0 is not yet supported at this time."
    ].join("\n")
  }
];

// web/src/ComfyUI-DrawThings-gRPC.ts
var nodePackVersion = "1.12.2";
var ComfyUI_DrawThings_gRPC_default = {
  name: "core",
  getCustomWidgets() {
    return {
      DT_MODEL: DtModelTypeHandler,
      DT_BUTTONS: DtButtonsTypeHandler
    };
  },
  beforeConfigureGraph(graph) {
    for (const node of graph.nodes) {
      if (node.type === "DrawThingsPositive" || node.type === "DrawThingsNegative") {
        node.type = "DrawThingsPrompt";
        node.properties["Node name for S&R"] = "DrawThingsPrompt";
        delete node.properties.ver;
        node.widgets_values.unshift("...");
      }
    }
  },
  async beforeRegisterNodeDef(nodeType, _nodeData, _app) {
    if ("comfyClass" in nodeType && nodeType.comfyClass === "DrawThingsSampler") {
      updateProto(nodeType, samplerProto);
    }
  },
  async setup(app4) {
    await syncSettings();
    setCallback(app4.api, "interrupt", async (_e) => {
      if (app4.rootGraph?.nodes.some((n) => n.type === "DrawThingsSampler")) {
        await app4.api.fetchApi(`/dt_grpc/interrupt`, {
          method: "POST"
        });
      }
    });
  },
  settings: [
    {
      id: "drawthings.node.show_preview",
      type: "boolean",
      name: "Show preview image while generating",
      defaultValue: true,
      category: ["Draw Things", "Nodes", "Preview"],
      onChange: async (value) => {
        await syncSettings({ show_preview: value });
      }
    },
    {
      id: "drawthings.node.blank_on_error",
      type: "boolean",
      name: "Return a blank image if the request fails",
      defaultValue: false,
      category: ["Draw Things", "Nodes", "Z Error handling"],
      tooltip: "This is a workaround to allow batch execution to continue even if a request fails.\nNot recommended for most uses cases, since errors will be silently ignored an caching will be disabled.",
      onChange: async (value) => {
        await syncSettings({ blank_on_error: value });
      }
    }
  ]
};
var samplerProto = {
  async onNodeCreated() {
    const app4 = getApp();
    const inputPos = this.inputs?.find(
      (inputPos2) => inputPos2.name === "positive"
    );
    const inputNeg = this.inputs?.find(
      (inputNeg2) => inputNeg2.name === "negative"
    );
    if (!app4.canvas || !inputPos || !inputNeg) return;
    inputPos.color_on = inputPos.color_off = inputNeg.color_on = inputNeg.color_off = app4.canvas.default_connection_color_byType.CONDITIONING;
    app4.canvas.default_connection_color_byType.DT_LORA = app4.canvas.default_connection_color_byType.MODEL;
    app4.canvas.default_connection_color_byType.DT_CNET = app4.canvas.default_connection_color_byType.CONTROL_NET;
    setTimeout(() => checkVersion(), 2e3);
  },
  onSerialize(serialised) {
    const ser = serialised;
    ser.nodePackVersion = nodePackVersion;
    ser.widget_values_keyed = plainWidgetValues(this);
  },
  onConfigure(serialised) {
    if ("widget_values_keyed" in serialised && serialised.widget_values_keyed && typeof serialised.widget_values_keyed === "object") {
      for (const [name, value] of Object.entries(
        serialised.widget_values_keyed
      )) {
        const widget = this.widgets?.find((w) => w.name === name);
        if (widget)
          widget.value = value;
      }
    }
    this.coerceWidgetValues();
    if ("widget_values_keyed" in this) delete this.widget_values_keyed;
    this.updateDynamicWidgets?.();
  },
  coerceWidgetValues() {
    const corrections = [];
    for (const w of this.widgets ?? []) {
      const prop = findPropertyPython(w.name);
      if (!prop) {
        continue;
      }
      const coerced = prop.coerce(w.value);
      if (coerced !== w.value) {
        corrections.push({ name: w.name, value: w.value, coerced });
        w.value = coerced;
      }
    }
    if (corrections.length) {
      const message = "The Draw Things Sampler node contained invalid values - they have been corrected:";
      const list = corrections.map(
        (c) => `${c.name}: ${c.value} -> ${c.coerced}`
      );
      const detail = `${message}

${list.join("\n")}`;
      getApp().extensionManager.toast.add({
        severity: "info",
        summary: "Draw Things gRPC",
        detail,
        life: 8e3
      });
    }
  },
  getConfigInputNodes() {
    const inputs = {
      DrawThingsLoRA: [],
      DrawThingsControlNet: [],
      DrawThingsUpscaler: [],
      DrawThingsRefiner: []
    };
    const upscaler = this.getInputNode(this.findInputSlot("upscaler"));
    if (upscaler) inputs.DrawThingsUpscaler.push(upscaler);
    const refiner = this.getInputNode(this.findInputSlot("refiner"));
    if (refiner) inputs.DrawThingsRefiner.push(refiner);
    let cnet = this.getInputNode(this.findInputSlot("control_net"));
    while (cnet) {
      inputs.DrawThingsControlNet.push(cnet);
      cnet = cnet.getInputNode(cnet.findInputSlot("control_net"));
    }
    let lora = this.getInputNode(this.findInputSlot("lora"));
    while (lora) {
      inputs.DrawThingsLoRA.push(lora);
      lora = lora.getInputNode(lora.findInputSlot("lora_stack"));
    }
    return inputs;
  },
  getExtraMenuOptions(_canvas, options) {
    const app4 = getApp();
    const showPreview = app4.extensionManager.setting.get(
      "drawthings.node.show_preview"
    );
    const keepNodeShrunk = app4.extensionManager.setting.get(
      "drawthings.node.keep_shrunk"
    );
    const bridgeMode = app4.extensionManager.setting.get(
      "drawthings.bridge_mode.enabled"
    );
    const bridgeCommunity = app4.extensionManager.setting.get(
      "drawthings.bridge_mode.community"
    );
    const bridgeUncurated = app4.extensionManager.setting.get(
      "drawthings.bridge_mode.uncurated"
    );
    options.push(null);
    options.push({
      content: "Paste Draw Things config",
      callback: () => {
        void importConfig(this);
      }
    });
    options.push({
      content: "Copy Draw Things config",
      callback: () => {
        const config = {};
        for (const w of this.widgets ?? []) {
          const prop = findPropertyPython(w.name);
          if (!prop) continue;
          prop.export(w, this, config);
        }
        config.loras = [];
        config.control = [];
        navigator.clipboard.writeText(JSON.stringify(config));
      }
    });
    options.push(null);
    options.push({
      content: (showPreview ? "\u2713 " : "") + "Show preview while generating",
      callback: () => {
        app4.extensionManager.setting.set(
          "drawthings.node.show_preview",
          !showPreview
        );
      }
    });
    options.push({
      content: (keepNodeShrunk ? "\u2713 " : "") + "Keep node shrunk when widgets change",
      callback: () => {
        app4.extensionManager.setting.set(
          "drawthings.node.keep_shrunk",
          !keepNodeShrunk
        );
      }
    });
    options.push(null);
    options.push({
      content: `${bridgeMode ? "\u2713 " : ""}Use bridge mode`,
      callback: () => {
        app4.extensionManager.setting.set(
          "drawthings.bridge_mode.enabled",
          !bridgeMode
        );
      }
    });
    if (bridgeMode) {
      options.push({
        content: `${bridgeCommunity ? "\u2713 " : ""}Show community models`,
        callback: () => {
          app4.extensionManager.setting.set(
            "drawthings.bridge_mode.community",
            !bridgeCommunity
          );
        }
      });
      options.push({
        content: `${bridgeUncurated ? "\u2713 " : ""}Show uncurated models`,
        callback: () => {
          app4.extensionManager.setting.set(
            "drawthings.bridge_mode.uncurated",
            !bridgeUncurated
          );
        }
      });
    }
    options.push(null);
    return options;
  }
};
async function syncSettings(patch) {
  const api = window.comfyAPI.api.api;
  const app4 = getApp();
  const showPreview = patch?.show_preview ?? app4.extensionManager.setting.get("drawthings.node.show_preview");
  const blankOnError = patch?.blank_on_error ?? app4.extensionManager.setting.get("drawthings.node.blank_on_error");
  const body = new FormData();
  body.append("show_preview", String(showPreview));
  body.append("blank_on_error", String(blankOnError));
  await api.fetchApi(`/dt_grpc/sync_settings`, {
    method: "POST",
    body
  });
}

// web/src/controlnet.ts
function updateControlWidgets(node) {
  const widget = findWidgetByName(node, "control_name");
  const val = widget?.value;
  const modelInfo = val?.value;
  const isModelSelected = !!modelInfo;
  const modifier = modelInfo?.modifier;
  const cnetType = modelInfo?.type;
  const inputTypeNode = findWidgetByName(node, "control_input_type");
  const showInputType = isModelSelected && (!modifier || cnetType === "controlnetunion");
  showWidget(node, "control_input_type", showInputType);
  const showGAP = modelInfo?.global_average_pooling;
  showWidget(node, "global_average_pooling", showGAP);
  const downSampleTypes = ["lowquality", "blur", "tile"];
  const inputTypeValue = inputTypeNode?.value;
  const showDownsample = downSampleTypes.includes(modifier) || (inputTypeValue ? downSampleTypes.includes(inputTypeValue.toLowerCase()) : false);
  showWidget(node, "down_sampling_rate", showDownsample);
  const targetBlocksTypes = ["ipadapterplus", "ipadapterfull", "ipadapterfaceidplus"];
  const showTargetBlocks = targetBlocksTypes.includes(cnetType) && (modelInfo?.version === "v1" || modelInfo?.version?.startsWith("sdxl"));
  showWidget(node, "target_blocks", showTargetBlocks);
}
var controlNetProto = {
  updateDynamicWidgets() {
    try {
      updateControlWidgets(this);
    } catch (error) {
      console.error(error);
    }
  },
  onNodeCreated() {
    this.updateDynamicWidgets();
  },
  onSerialize(serialised) {
    serialised.nodePackVersion = nodePackVersion;
    if (this.widgets) {
      serialised.widget_values_keyed = plainWidgetValues(this);
    }
  },
  onConfigure(data) {
    if (data.widget_values_keyed && this.widgets) {
      for (const [name, value] of Object.entries(data.widget_values_keyed)) {
        const widget = this.widgets.find((w) => w.name === name);
        if (widget) widget.value = value;
      }
    } else if (data.widgets_values && data.widgets_values.length === 8 && this.widgets) {
      const widgetNames = [
        "control_name",
        "control_input_type",
        "control_mode",
        "control_weight",
        "control_start",
        "control_end",
        "global_average_pooling",
        "invert_image"
      ];
      for (let i = 0; i < widgetNames.length; i++) {
        const widget = this.widgets.find((w) => w.name === widgetNames[i]);
        if (widget) widget.value = data.widgets_values[i];
      }
    }
    delete this.widget_values_keyed;
    restoreModelSelections(this);
    this.updateDynamicWidgets();
  },
  onWidgetChanged(name, value, old_Value, widget) {
    if (name === "control_name") {
      const modifier = value?.value?.modifier;
      const inputWidget = findWidgetByName(this, "control_input_type");
      if (modifier && inputWidget?.value !== capitalize(modifier)) {
        if (inputWidget) inputWidget.value = capitalize(modifier);
      }
    }
    this.updateDynamicWidgets();
  }
};
var extension3 = {
  name: "controlNetNode",
  beforeRegisterNodeDef(nodeType, nodeData, app4) {
    if (nodeType.comfyClass === "DrawThingsControlNet") {
      updateProto(nodeType, controlNetProto);
    }
  }
};
var controlnet_default = extension3;
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// web/src/dtModelNodes.ts
var dtModelNodeTypes = [
  "DrawThingsSampler",
  "DrawThingsControlNet",
  "DrawThingsLoRA",
  "DrawThingsUpscaler",
  "DrawThingsRefiner",
  "DrawThingsPrompt"
];
var dtServerNodeTypes = ["DrawThingsSampler"];
var extension4 = {
  name: "modelNodes",
  beforeRegisterNodeDef: (nodeType, nodeData, app4) => {
    if (dtModelNodeTypes.includes(nodeType.comfyClass)) {
      updateProto(nodeType, dtModelNodeProto);
      if (dtServerNodeTypes.includes(nodeType.comfyClass)) {
        updateProto(nodeType, dtServerNodeProto);
      }
    }
  },
  settings: [
    {
      id: "drawthings.bridge_mode.enabled",
      type: "boolean",
      name: "Enable bridge mode",
      defaultValue: true,
      category: ["Draw Things", "Bridge mode", "Bridge mode"],
      sortOrder: 2,
      tooltip: "With bridge mode enabled, your local models will be hidden and the official models available to DT+ will be listed. Be sure to enable Bridge Mode in your Draw Things API settings (DT+ only)"
    },
    {
      id: "drawthings.bridge_mode.community",
      type: "boolean",
      name: "Show community models",
      defaultValue: true,
      category: ["Draw Things", "Bridge mode", "Community"],
      sortOrder: 1,
      tooltip: "When bridge mode is enabled, also list community models"
    },
    {
      id: "drawthings.bridge_mode.uncurated",
      type: "boolean",
      name: "Show uncurated models",
      defaultValue: false,
      category: ["Draw Things", "Bridge mode", "Uncurated"],
      sortOrder: 0,
      tooltip: "When bridge mode is enabled, also list uncurated models"
    }
  ]
};
var dtModelNodes_default = extension4;
var dtModelNodeProto = {
  saveSelectedModels() {
    const modelWidgets = this.widgets?.filter((w) => w.options?.modelType) || [];
    const selections = modelWidgets.reduce((acc, w) => {
      if (typeof w.value === "object" || w.value === "(None selected)")
        acc[w.name] = w.value;
      else acc[w.name] = this._lastSelectedModel?.[w.name];
      return acc;
    }, {});
    this._lastSelectedModel = selections;
  },
  lastSelectedModel: {
    get() {
      return this._lastSelectedModel;
    },
    enumerable: true
  },
  isDtServerNode: {
    get() {
      return dtServerNodeTypes.includes(this?.comfyClass);
    },
    enumerable: true
  },
  onSerialize(serialised) {
    serialised._lastSelectedModel = JSON.parse(
      JSON.stringify(this._lastSelectedModel ?? {})
    );
  },
  onConfigure(serialised) {
    this._lastSelectedModel = serialised._lastSelectedModel || {};
    restoreModelSelections(this);
  },
  getModelWidgets() {
    return this.widgets?.filter((w) => w.options?.modelType) || [];
  },
  findServerNodes() {
    return findServerNodes(this);
  }
};
var dtServerNodeProto = {
  onAdded() {
    void updateServerConnection(this).catch(() => {
    });
  },
  onConfigure() {
    queueMicrotask(() => {
      if (this.graph) void updateServerConnection(this).catch(() => {
      });
    });
  },
  onWidgetChanged(name) {
    if (["server", "port", "use_tls"].includes(name))
      void updateServerConnection(this).catch(() => {
      });
  },
  getServer() {
    const server = this.widgets?.find((w) => w.name === "server")?.value;
    const port = this.widgets?.find((w) => w.name === "port")?.value;
    const useTls = this.widgets?.find((w) => w.name === "use_tls")?.value;
    return { server, port, useTls };
  },
  getModelVersion() {
    const widget = this.widgets?.find((w) => w.options?.modelType === "models");
    const selection = widget?.value === "Not connected" ? this._lastSelectedModel?.[widget.name] : widget?.value;
    return selection?.value?.version;
  }
};

// web/src/dtPromptNode.ts
var promptProto = {
  onWidgetChanged(name, value, old_Value, widget) {
    if (name === "insert_textual_inversion") {
      const keyword = value?.value?.keyword;
      if (!keyword) return;
      const tag = `<${keyword}>`;
      const textWidget = this.widgets?.find((w) => w.name === "prompt");
      const text = textWidget?.value ?? "";
      if (typeof text === "string" && textWidget) {
        if (text.includes(tag)) {
          textWidget.value = text.split(tag).join("");
        } else {
          textWidget.value = `<${keyword}> ${text}`;
        }
      }
      widget.value = "...";
    }
  },
  onConnectionsChange(type, index, isConnected, link_info, inputOrOutput) {
    if (getApp().extensionManager.setting.get("drawthings.node.color_prompts") === false) return;
    let isPositive = false;
    let isNegative = false;
    for (const linkId of this.outputs?.[0]?.links ?? []) {
      const link = this.graph?.getLink(linkId);
      if (!link) continue;
      const targetId = link.target_id;
      const targetNode = this.graph?.getNodeById(targetId);
      if (targetNode?.comfyClass === "DrawThingsSampler") {
        const input = targetNode?.inputs?.[link.target_slot];
        if (input?.name === "positive") isPositive = true;
        if (input?.name === "negative") isNegative = true;
      }
    }
    if (isPositive && isNegative) {
      this.color = window.LGraphCanvas.node_colors.purple.color;
      this.bgcolor = window.LGraphCanvas.node_colors.purple.bgcolor;
    } else if (isPositive) {
      this.color = window.LGraphCanvas.node_colors.green.color;
      this.bgcolor = window.LGraphCanvas.node_colors.green.bgcolor;
    } else if (isNegative) {
      this.color = window.LGraphCanvas.node_colors.red.color;
      this.bgcolor = window.LGraphCanvas.node_colors.red.bgcolor;
    } else {
      this.color = void 0;
      this.bgcolor = void 0;
    }
  },
  onNodeCreated() {
    const output = this.outputs?.find((output2) => output2.name == "PROMPT");
    if (output) {
      output.color_on = output.color_off = getApp().canvas.default_connection_color_byType["CONDITIONING"];
    }
  },
  getExtraMenuOptions(canvas, options) {
    const app4 = getApp();
    const promptColors = app4.extensionManager.setting.get("drawthings.node.color_prompts");
    options.push(
      ...[
        null,
        {
          content: (promptColors ? "\u2713 " : "") + "Change colors when connections change",
          callback: async () => {
            try {
              await app4.extensionManager.setting.set("drawthings.node.color_prompts", !promptColors);
            } catch (error) {
              console.error(`Error changing setting: ${error}`);
            }
          }
        },
        null
      ]
    );
  }
};
var extension5 = {
  name: "promptNode",
  beforeRegisterNodeDef(nodeType, nodeData, app4) {
    if (nodeType.comfyClass === "DrawThingsPrompt") {
      updateProto(nodeType, promptProto);
    }
  },
  settings: [
    {
      id: "drawthings.node.color_prompts",
      type: "boolean",
      name: "Change prompt node colors when connections change",
      defaultValue: true,
      category: ["Draw Things", "Nodes", "Change prompt"],
      onChange: (newVal, oldVal) => {
        if (oldVal === false && newVal === true) {
          getApp().graph.nodes.filter((n) => n.type === "DrawThingsPrompt").forEach((n) => {
            setTimeout(() => n.onConnectionsChange(), 10);
          });
        }
      }
    }
  ]
};
var dtPromptNode_default = extension5;
var modules = [
  ComfyUI_DrawThings_gRPC_default,
  dtPromptNode_default,
  dtModelNodes_default,
  /* dtDynamicInputs, */
  widgets_default,
  lora_default,
  controlnet_default
];
app$1.registerExtension({
  name: "Draw Things for ComfyUI",
  getCustomWidgets(...args) {
    return ComfyUI_DrawThings_gRPC_default.getCustomWidgets ? ComfyUI_DrawThings_gRPC_default.getCustomWidgets.apply(ComfyUI_DrawThings_gRPC_default, args) : {};
  },
  beforeConfigureGraph(...args) {
    for (const module of modules) {
      try {
        module.beforeConfigureGraph?.apply(module, args);
      } catch (e) {
        console.error(`Error in ${module.name} beforeConfigureGraph:`, e);
      }
    }
  },
  beforeRegisterNodeDef(...args) {
    for (const module of modules) {
      try {
        module.beforeRegisterNodeDef?.apply(module, args);
      } catch (e) {
        console.error(`Error in ${module.name} beforeConfigureGraph:`, e);
      }
    }
  },
  afterConfigureGraph(...args) {
    for (const module of modules) {
      try {
        module.afterConfigureGraph?.apply(module, args);
      } catch (e) {
        console.error(`Error in ${module.name} afterConfigureGraph:`, e);
      }
    }
  },
  setup(...args) {
    for (const module of modules) {
      try {
        module.setup?.apply(module, args);
      } catch (e) {
        console.error(`Error in ${module.name} beforeConfigureGraph:`, e);
      }
    }
    injectStyle();
  },
  settings: modules.flatMap((m) => m.settings ?? []),
  aboutPageBadges: [
    {
      label: `Draw Things for ComfyUI v${nodePackVersion}`,
      url: "https://github.com/drawthingsai/draw-things-comfyui",
      icon: "dt-grpc-about-badge-logo"
    }
  ]
});
var rule = `.dt-grpc-about-badge-logo {
    width: 20px;
    height: 20px;
    background-size: 100% 100%;
    background-color: currentcolor;
    -webkit-mask-image: url(/dt_grpc/logo.svg);
    mask-image: url(/dt_grpc/logo.svg);
}`;
var ruleId = "dt-grpc-css-injected";
function injectStyle() {
  const existing = document.getElementById(ruleId);
  if (existing) {
    return;
  }
  const style = document.createElement("style");
  style.id = ruleId;
  style.addEventListener("load", (e) => {
    style.sheet.insertRule(rule, style.sheet.cssRules.length);
  });
  document.head.appendChild(style);
}

export { injectStyle };
//# sourceMappingURL=extension.esm.js.map
//# sourceMappingURL=extension.esm.js.map