import { findServerNodes, restoreModelSelections, updateServerConnection } from "./models.js";
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
			tooltip:
				"With bridge mode enabled, your local models will be hidden and the official models available to DT+ will be listed. Be sure to enable Bridge Mode in your Draw Things API settings (DT+ only)",
		},
		{
			id: "drawthings.bridge_mode.community",
			type: "boolean",
			name: "Show community models",
			defaultValue: true,
			category: ["Draw Things", "Bridge mode", "Community"],
			sortOrder: 1,
			tooltip: "When bridge mode is enabled, also list community models",
		},
		{
			id: "drawthings.bridge_mode.uncurated",
			type: "boolean",
			name: "Show uncurated models",
			defaultValue: false,
			category: ["Draw Things", "Bridge mode", "Uncurated"],
			sortOrder: 0,
			tooltip: "When bridge mode is enabled, also list uncurated models",
		},
	],
};

export default extension;

interface DTModelNode extends LGraphNode {
	_lastSelectedModel?: Record<string, any>;
	getModelWidgets: () => IWidget[];
	saveSelectedModels: () => void;
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
		restoreModelSelections(this);
	},
	getModelWidgets(this: DTModelNode) {
		return this.widgets?.filter((w) => (w.options as any)?.modelType) || [];
	},
	findServerNodes(this: DTModelNode) {
		return findServerNodes(this);
	},
};

interface DTServerNode extends DTModelNode {
	getServer: () => { server: any; port: any; useTls: any };
	getModelVersion: () => string | undefined;
	saveSelectedModels: () => void;
}

const dtServerNodeProto: any = {
	onAdded(this: DTServerNode) {
		void updateServerConnection(this).catch(() => {});
	},
	onConfigure(this: DTServerNode) {
		// The core sampler hook may apply keyed server values later in this call.
		queueMicrotask(() => {
			if (this.graph) void updateServerConnection(this).catch(() => {});
		});
	},
	onWidgetChanged(this: DTServerNode, name: string) {
		if (["server", "port", "use_tls"].includes(name))
			void updateServerConnection(this).catch(() => {});
	},
	getServer(this: DTServerNode) {
		const server = this.widgets?.find((w) => w.name === "server")?.value;
		const port = this.widgets?.find((w) => w.name === "port")?.value;
		const useTls = this.widgets?.find((w) => w.name === "use_tls")?.value;
		return { server, port, useTls };
	},

	getModelVersion(this: DTServerNode) {
		const widget = this.widgets?.find((w) => (w.options as any)?.modelType === "models");
		const selection = widget?.value === "Not connected"
			? this._lastSelectedModel?.[widget.name] : widget?.value;
		return (selection as any)?.value?.version;
	},

};
