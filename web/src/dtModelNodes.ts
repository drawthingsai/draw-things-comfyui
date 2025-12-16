import { setCallback } from "./dynamicInputs.js";
import { modelService, getMenuItem } from "./models.js";
import { updateProto } from "./util.js";
import type { LGraphNode, IWidget } from "@comfyorg/litegraph";
import type { ComfyExtension } from "@comfyorg/comfyui-frontend-types";

export const dtModelNodeTypes = [
	"DrawThingsSampler",
	"DrawThingsControlNet",
	"DrawThingsLoRA",
	"DrawThingsUpscaler",
	"DrawThingsRefiner",
	"DrawThingsPrompt",
];
export const dtServerNodeTypes = ["DrawThingsSampler"];

const extension: ComfyExtension = {
	name: "modelNodes",

	beforeRegisterNodeDef: (nodeType, nodeData, app) => {
		if (dtModelNodeTypes.includes((nodeType as any).comfyClass)) {
			updateProto(nodeType, dtModelNodeProto);
			if (dtServerNodeTypes.includes((nodeType as any).comfyClass)) {
				updateProto(nodeType, dtServerNodeProto);
			} else if ((nodeType as any).comfyClass === "DrawThingsPrompt") {
				updateProto(nodeType, dtModelPromptNodeProto);
			} else {
				updateProto(nodeType, dtModelStandardNodeProto);
			}
		}
	},

	afterConfigureGraph() {
		modelService.updateNodes();
	},

	settings: [
		{
			id: "drawthings.bridge_mode.enabled",
			type: "boolean",
			name: "Enable bridge mode",
			defaultValue: true,
			category: ["Draw Things", "Bridge mode", "Bridge mode"],
			sortOrder: 2,
			tooltip:
				"With bridge mode enabled, your local models will be hidden and the official models available to DT+ will be listed. Be sure to enable Bridge Mode in your Draw Things API settings (DT+ only)",
			onChange: (value) => {
				modelService.updateNodes();
			},
		},
		{
			id: "drawthings.bridge_mode.community",
			type: "boolean",
			name: "Show community models",
			defaultValue: true,
			category: ["Draw Things", "Bridge mode", "Community"],
			sortOrder: 1,
			tooltip: "When bridge mode is enabled, also list community models",
			onChange: (value) => { 
				modelService.updateNodes();
			},
		},
		{
			id: "drawthings.bridge_mode.uncurated",
			type: "boolean",
			name: "Show uncurated models",
			defaultValue: false,
			category: ["Draw Things", "Bridge mode", "Uncurated"],
			sortOrder: 0,
			tooltip: "When bridge mode is enabled, also list uncurated models",
			onChange: (value) => {
				modelService.updateNodes();
			},
		},
	],
};

export default extension;

interface DTModelNode extends LGraphNode {
	_lastSelectedModel?: Record<string, any>;
	getModelWidgets: () => IWidget[];
	findServerNodes: () => LGraphNode[];
	isDtServerNode: boolean;
	comfyClass: string;
}

const dtModelNodeProto: any = {
	saveSelectedModels(this: DTModelNode) {
		const modelWidgets =
			this.widgets?.filter((w) => (w.options as any)?.modelType) || [];
		const selections = modelWidgets.reduce((acc: Record<string, any>, w) => {
			if (typeof w.value === "object" || w.value === "(None selected)")
				acc[w.name] = w.value;
			else acc[w.name] = this._lastSelectedModel?.[w.name];
			return acc;
		}, {});

		this._lastSelectedModel = selections;
	},
	lastSelectedModel: {
		get(this: DTModelNode) {
			return this._lastSelectedModel;
		},
		enumerable: true,
	},
	isDtServerNode: {
		get(this: DTModelNode) {
			return dtServerNodeTypes.includes(this?.comfyClass);
		},
		enumerable: true,
	},
	onSerialize(this: DTModelNode, serialised: any) {
		serialised._lastSelectedModel = JSON.parse(
			JSON.stringify(this._lastSelectedModel ?? {}),
		);
	},
	onConfigure(this: DTModelNode, serialised: any) {
		this._lastSelectedModel = serialised._lastSelectedModel || {};
	},
	getModelWidgets(this: DTModelNode) {
		return this.widgets?.filter((w) => (w.options as any)?.modelType) || [];
	},
	onAdded() {
		modelService.updateNodes();
	},
	findServerNodes(this: DTModelNode) {
		if (dtServerNodeTypes.includes(this.comfyClass)) return [this];
		if (this.outputs?.length !== 1)
			throw new Error("what node is this? Should only have a single output");

		function searchOutputNodes(node: LGraphNode): LGraphNode[] {
			const serverNodes: LGraphNode[] = [];
			const outputNodes = node.getOutputNodes(0) ?? [];
			for (const outputNode of outputNodes) {
				if ((outputNode as any).isDtServerNode) serverNodes.push(outputNode);
				else serverNodes.push(...searchOutputNodes(outputNode));
			}
			return serverNodes;
		}

		return searchOutputNodes(this);
	},
};

interface DTServerNode extends DTModelNode {
	getServer: () => { server: any; port: any; useTls: any };
	getModelVersion: () => string | undefined;
	updateModels: (models: any, version: string) => void;
}

const dtServerNodeProto: any = {
	onNodeCreated(this: DTServerNode) {
		// update when server or port changes
		const serverWidget = this.widgets?.find((w) => w.name === "server");
		if (serverWidget)
			setCallback(serverWidget, "callback", () => modelService.updateNodes());

		const portWidget = this.widgets?.find((w) => w.name === "port");
		if (portWidget)
			setCallback(portWidget, "callback", () => modelService.updateNodes());

		const tlsWidget = this.widgets?.find((w) => w.name === "use_tls");
		if (tlsWidget)
			setCallback(tlsWidget, "callback", () => modelService.updateNodes());
	},

	getServer(this: DTServerNode) {
		const server = this.widgets?.find((w) => w.name === "server")?.value;
		const port = this.widgets?.find((w) => w.name === "port")?.value;
		const useTls = this.widgets?.find((w) => w.name === "use_tls")?.value;
		return { server, port, useTls };
	},

	getModelVersion(this: DTServerNode) {
		return (
			this.widgets?.find((w) => (w.options as any)?.modelType === "models")
				?.value as any
		)?.value?.version;
	},

	updateModels(this: DTServerNode, models: any, version: string) {
		const widgets = this.getModelWidgets();
		for (const widget of widgets) {
			if (!widget) return;
			if (!models) {
				if (widget.options)
					widget.options.values = ["Not connected", "Click to retry"];
				widget.value = "Not connected";
				continue;
			}

			if (widget.options)
				widget.options.values = [
					"(None selected)",
					...models.models
						.map((m: any) => getMenuItem(m, false))
						.sort((a: any, b: any) => a.content.localeCompare(b.content)),
				];

			if (widget.value === "Click to retry" || widget.value === "Not connected") {
				if (this._lastSelectedModel?.model)
					widget.value = this._lastSelectedModel.model;
				else widget.value = "(None selected)";
			}

			if (widget.value?.toString() === "[object Object]") {
				const value = {
					...(widget.value as any),
					toString() {
						return this.value.name;
					},
				};
				widget.value = value;
			}
		}
	},
};

// for cnet, lora, upscaler, and refiner
const dtModelStandardNodeProto: any = {
	onConnectionsChange(
		type: any,
		index: any,
		isConnected: boolean,
		link_info: any,
		inputOrOutput: any,
	) {
		if (isConnected) modelService.updateNodes();
	},

	updateModels(this: DTModelNode, models: any, versions: string[] = []) {
		const widgets = this.getModelWidgets();
		for (const widget of widgets) {
			if (!widget) return;

			const type = (widget?.options as any)?.modelType;

			if (!models?.[type]) {
				if (widget.options)
					widget.options.values = ["Not connected", "Click to retry"];
				widget.value = "Not connected";
				continue;
			}

			if (widget.options)
				widget.options.values = [
					"(None selected)",
					...models[type]
						.map((m: any) =>
							getMenuItem(
								m,
								m.version &&
									versions.length > 0 &&
									!versions.includes(m.version),
							),
						)
						.sort((a: any, b: any) => {
							if (a.disabled && !b.disabled) return 1;
							if (!a.disabled && b.disabled) return -1;
							return a.content
								.toUpperCase()
								.localeCompare(b.content.toUpperCase());
						}),
				];

			if (widget.value === "Click to retry" || widget.value === "Not connected") {
				if (this._lastSelectedModel?.[widget.name])
					widget.value = fixLabel(this._lastSelectedModel[widget.name]);
				else widget.value = "(None selected)";
			}

			if (widget.value?.toString() === "[object Object]") {
				const value = {
					...(widget.value as any),
					toString() {
						return this.value.name;
					},
				};
				widget.value = value;
			}
		}
	},
};

const dtModelPromptNodeProto: any = {
	onConnectionsChange(
		type: any,
		index: any,
		isConnected: boolean,
		link_info: any,
		inputOrOutput: any,
	) {
		if (isConnected) modelService.updateNodes();
	},

	updateModels(this: any, models: any, version: any) {
		this._models = models?.textualInversions || null;
		this._version = version;
		this.updateOptions();
	},

	updateOptions(this: any) {
		const widgets = this.getModelWidgets();
		for (const widget of widgets) {
			if (!widget) return;

			if (this._models === null) {
				if (widget.options)
					widget.options.values = ["Not connected", "Click to retry"];
				widget.value = "Not connected";
				return;
			}

			const promptText = this.widgets.find(
				(w: any) => w.name === "prompt",
			)?.value;
			const matches = [...promptText.matchAll(/<(.*?)>/gm)];
			const tags = matches.map((m) => m[1]);
			if (widget.options)
				widget.options.values = [
					"...",
					...this._models
						.map((m: any) =>
							getMenuItem(
								m,
								this._version &&
									this._version.length > 0 &&
									!this._version.includes(m.version) &&
									!tags.includes(m.keyword),
							),
						)
						.map((m: any) => {
							Object.defineProperty(m, "content", {
								get() {
									return `${tags.includes(m.value.keyword) ? "✓ " : ""}${m.value.name} (${m.value.version})`;
								},
							});
							return m;
						})
						.sort((a: any, b: any) => {
							if (a.disabled && !b.disabled) return 1;
							if (!a.disabled && b.disabled) return -1;
							return a.content
								.toUpperCase()
								.localeCompare(b.content.toUpperCase());
						}),
				];

			widget.value = "...";
		}
	},
};

function fixLabel(value: any) {
	if (value?.toString() === "[object Object]") {
		return {
			...value,
			toString() {
				return this.value.name;
			},
		};
	}
	return value;
}
