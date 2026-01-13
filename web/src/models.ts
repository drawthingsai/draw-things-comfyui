import {
	type LGraphNode,
	type IWidget,
	type INodeInputSlot,
	type LGraph,
	type SubgraphNode,
} from "@comfyorg/litegraph";
import type { ComfyApp } from "@comfyorg/comfyui-frontend-types";
import { CombinedModelsResponse } from "./modelsTypes";

// @ts-ignore
const app = window.comfyAPI.app.app;

interface DTServerNode extends LGraphNode {
	isDtServerNode?: boolean;
	getServer: () => { server: string; port: number | string; useTls: boolean };
	updateModels?: (models: any, versions?: any) => void;
	findServerNodes?: () => DTServerNode[];
	getModelVersion?: () => string;
}

interface DTModelNode extends LGraphNode {
	isDtServerNode?: boolean;
	updateModels?: (models: any, versions?: any) => void;
	findServerNodes?: () => DTServerNode[];
	saveSelectedModels?: () => void;
}

class ModelService {
	#updateNodesPromise: Promise<void> | null = null;

	constructor() {}

	async updateNodes() {
		// since many nodes may be configured at once, we will batch calls to updateNodes
		if (app.configuringGraph || !app.graph) return;
		if (!this.#updateNodesPromise) {
			this.#updateNodesPromise = new Promise((res) => {
				setTimeout(() => {
					this.#updateNodesPromise = null;
					this.#updateNodes().then(() => res());
				}, 10);
			});
		}

		return this.#updateNodesPromise;
	}

	async #updateNodes() {
		const dtModelNodes = getNodesRecursive(app.graph).filter(
			(n: any) => n.isDtServerNode !== undefined,
		) as DTModelNode[];
		const graphServerNodes = dtModelNodes.filter(
			(n) => n.isDtServerNode,
		) as DTServerNode[];
		if (!graphServerNodes.length) return;

		const nodesUpdated = new Map(dtModelNodes.map((n) => [n, false]));
		/** @type {Map<string, ModelInfo | undefined>} */
		const serverModels = new Map<string, ModelInfo | undefined>();

		for (const sn of graphServerNodes) {
			// get fresh models list for the server
			const { server, port, useTls } = sn.getServer();
			if (!server || !port || useTls === undefined) continue;
			const key = modelInfoStoreKey(server, port, useTls);
			if (!serverModels.has(key)) {
				serverModels.set(key, await getModels(server, port, useTls));
			}

			// update server node's models
			const models = serverModels.get(key);
			sn.updateModels?.(models);
			nodesUpdated.set(sn, true);
		}

		for (const node of dtModelNodes) {
			if (nodesUpdated.get(node)) continue;

			// determine the server(s) and version(s) this node is connected to
			/** @type {import('@comfyorg/litegraph').LGraphNode[]?} */
			const serverNodes = node?.findServerNodes?.();
			if (!serverNodes || !serverNodes.length) continue;

			let mergedModels = {};
			for (const sn of serverNodes) {
				const { server, port, useTls } = sn.getServer();
				if (!server || !port || useTls === undefined) continue;
				const models = serverModels.get(
					modelInfoStoreKey(server, port, useTls),
				);
				mergedModels = mergeModels(mergedModels, models);
			}
			const versions = serverNodes
				.map((sn) => sn?.getModelVersion?.())
				.filter((v) => v);

			node.updateModels?.(mergedModels, versions);
			nodesUpdated.set(node, true);
		}

		// these nodes are not connected to a sampler node
		// if there's a single server, update them with those models
		const models =
			serverModels.size === 1 ? serverModels.values().next().value : null;
		for (const node of nodesUpdated.keys()) {
			if (nodesUpdated.get(node) === false) {
				nodesUpdated.set(node, true);
				node.updateModels?.(models);
			}
		}
	}
}

function getNodesRecursive(graph: LGraph): LGraphNode[] {
	const nodes = [];
	for (const node of graph.nodes) {
		if ("subgraph" in node) {
			nodes.push(...getNodesRecursive(node.subgraph));
		} else {
			nodes.push(node);
		}
	}
	return nodes;
}

export const modelService = new ModelService();

/**
 * @param node {LGraphNode}
 * @param inputName {string}
 * @param inputData {["DT_MODEL", {model_type: string}]}
 */
export function DtModelTypeHandler(
	node: DTModelNode,
	inputName: string,
	inputData: any,
	app: ComfyApp,
) {
	const widget = node.addWidget(
		"combo",
		inputName,
		"(None selected)",
		/** @type WidgetCallback<IWidget<any, any>> */
		(
			(value: any, graph: any, node: any) => {
				node.saveSelectedModels?.();
				modelService.updateNodes();
			}
		) as any,
		{
			values: ["(None selected)"],
			modelType: inputData[1].model_type,
		} as any,
	);

	return { widget };
}

/**
 * @param {string} server
 * @param {number | string} port
 */
export async function getFiles(
	server: string,
	port: number | string,
	useTls: boolean,
) {
	const body = new FormData();
	body.append("server", server);
	body.append("port", String(port));
	body.append("use_tls", String(useTls));

	const api = window.comfyAPI.api.api;
	const filesInfoResponse = await api.fetchApi(`/dt_grpc/files_info`, {
		method: "POST",
		body,
	});

	return filesInfoResponse;
}

let combinedModelsJson: CombinedModelsResponse | null = null;
let combinedIncludes: [boolean | null, boolean | null] = [null, null];
let combinedBridgeModels: ModelInfo | null = null;
async function getBridgeModels() {
	const includeCommunity = app.extensionManager.setting.get(
		"drawthings.bridge_mode.community",
	);
	const includeUncurated = app.extensionManager.setting.get(
		"drawthings.bridge_mode.uncurated",
	);
	if (
		combinedBridgeModels &&
		combinedIncludes[0] === includeCommunity &&
		combinedIncludes[1] === includeUncurated
	)
		return combinedBridgeModels;

	if (!combinedModelsJson) {
		const api = window.comfyAPI.api.api;
		const filesResponse = await api.fetchApi("/dt_grpc/bridge_models");
		const files = (await filesResponse.json()) as string[];

		const combinedModelsResponse = await api.fetchApi(
			"/dt_grpc/combined_models",
		);

		const combinedModelsRaw: CombinedModelsResponse =
			await combinedModelsResponse.json();
		combinedModelsJson = {} as CombinedModelsResponse;
    for (const [key, value] of Object.entries(combinedModelsRaw)) {
      if (!Array.isArray(value)) continue
			combinedModelsJson[key as keyof CombinedModelsResponse] = value.filter(
				(m) => files.includes(m.file),
			) as CombinedModelsResponse[typeof key];
		}
	}

	const models = [...combinedModelsJson.officialModels];
	const controlNets = [...combinedModelsJson.officialCnets];
	const loras = [...combinedModelsJson.officialLoras];
	const textualInversions = [];

	if (includeCommunity) {
		models.push(...combinedModelsJson.communityModels);
		controlNets.push(...combinedModelsJson.communityCnets);
		loras.push(...combinedModelsJson.communityLoras);
		textualInversions.push(...combinedModelsJson.communityEmbeddings);
	}

	if (includeUncurated) {
		models.push(...combinedModelsJson.uncuratedModels);
	}

	combinedBridgeModels = {
		models,
		controlNets,
		loras,
		textualInversions,
		upscalers: [],
	};
	combinedIncludes = [includeCommunity, includeUncurated];

	return combinedBridgeModels;
}

/* @typedef {{ models: any[], controlNets: any[], loras: any[], upscalers: any[]}} ModelInfo */

export interface Model {
		name: string;
		file: string;
		version?: string;
	}

export interface ModelInfo {
		models: Model[];
		controlNets: Model[];
		loras: Model[];
		textualInversions: Model[];
		upscalers: Model[];
		[key: string]: Model[]; // Allow dynamic keys for mergeModels
	}

/** @type Map<string, ModelInfo> */
const modelInfoStore = new Map<string, ModelInfo | null>();
/** @type Map<string, Promise<void>> */
const modelInfoRequests = new Map<string, Promise<void>>();
const modelInfoStoreKey = (
	server?: string,
	port?: number | string,
	useTls?: boolean,
) => `${server}:${port}${useTls ? ":tls" : ""}`;

// yes this is kind of hacky :)
const failedConnectionOptions = [
	"Couldn't connect to server",
	"Check server and click to retry",
].map((c, i) => ({
	name: c,
	file: "",
	version: "fail",
	order: i + 1,
})) as any[];

const notConnectedOptions = [
	"Not connected to sampler node",
	"Connect to a sampler node to list available models",
].map((c) => ({
	name: c,
	file: "",
	version: "fail",
}));

async function getModels(
	server: string,
	port: number | string,
	useTls: boolean,
) {
	if (!server || !port || useTls === undefined) return;
	if (app.extensionManager.setting.get("drawthings.bridge_mode.enabled"))
		return getBridgeModels();

	const key = modelInfoStoreKey(server, port, useTls);
	if (modelInfoRequests.has(key)) {
		const request = modelInfoRequests.get(key);
		await request;
	} else {
		const promise = new Promise<void>((resolve) => {
			getFiles(server, port, useTls).then(async (response) => {
				if (!response.ok) {
					modelInfoStore.set(key, null);
				} else {
					const data = await response.json();
					testHack(data);
					modelInfoStore.set(key, data);
				}
				modelInfoRequests.delete(key);
				resolve();
			});
		});
		modelInfoRequests.set(key, promise);
		await promise;
	}

	return modelInfoStore.get(key) || undefined;
}

const failedConnectionInfo: ModelInfo = {
	models: failedConnectionOptions,
	controlNets: notConnectedOptions,
	loras: notConnectedOptions,
	upscalers: notConnectedOptions,
	textualInversions: notConnectedOptions,
};

modelInfoStore.set(modelInfoStoreKey(), failedConnectionInfo);

/** @param node {LGraphNode} */
function getInputNodes(node: LGraphNode) {
	return node.inputs
		.map((input, i) => [i, input] as [number, INodeInputSlot])
		.filter(([index, input]) => input.link !== null)
		.map(([index, input]) => node.getInputNode(Number(index)));
}

export function getMenuItem(model: Model, disabled: boolean) {
	return {
		value: model,
		content:
			model.version && model.version !== "fail"
				? `${model.name} (${getVersionAbbrev(model.version)})`
				: model.name,
		toString() {
			return model.name;
		},
		// has_submenu?: boolean;
		disabled,
		// submenu?: IContextMenuSubmenu<TValue>;
		// property?: string;
		// type?: string;
		// slot?: IFoundSlot;
		// callback(this: ContextMenuDivElement<TValue>, value?: TCallbackValue, options?: unknown, event?: MouseEvent, previous_menu?: ContextMenu<TValue>, extra?: TExtra) {
		callback(...args: any[]) {
			return false;
		},
	};
}

/**
 *
 * @param {ModelInfo?} modelInfoA
 * @param {ModelInfo?} modelInfoB
 */
function mergeModels(
	modelInfoA: ModelInfo | undefined | null | {},
	modelInfoB: ModelInfo | undefined | null,
) {
	/** @type {ModelInfo} */
	const merged: ModelInfo = {} as any;
	/** @type {Set<keyof ModelInfo>} */
	const types = new Set(
		Object.keys(modelInfoA ?? {}).concat(Object.keys(modelInfoB ?? {})),
	);
	for (const type of types.values()) {
		(merged as any)[type] = (modelInfoA as any)[type] ?? [];
		const modelFiles = (merged as any)[type].map((m: any) => m.file);
		const extras: any[] = ((modelInfoB as any)[type] ?? []).filter(
			(m: any) => !modelFiles.includes(m.file),
		);
		(merged as any)[type] = (merged as any)[type].concat(extras);
	}
	return merged;
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
    flux2: "F2"
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
	} catch {}
}
