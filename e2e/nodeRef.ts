import { Page } from "@playwright/test";
import { centerOnPoint } from "./util";

export async function getNodeRef(
	page: Page,
	node: number | string | ((node) => boolean),
	options?: {
		doNotThrow?: boolean;
	},
) {
	const nodeId = await page.evaluate((node) => {
		if (typeof node === "number") {
			return window.app.graph._nodes[node]?.id;
		} else if (typeof node === "string") {
			return window.app.graph._nodes.find((n) => n.type === node)?.id;
		} else if (typeof node === "function") {
			return window.app.graph._nodes.find(node)?.id;
		}
		return null;
	}, node);

	if (nodeId === null || nodeId === undefined) {
		if (options?.doNotThrow) return undefined;
		throw new Error(`Node not found: ${node}`);
	}

	return new NodeRef(nodeId, page);
}

export async function addNode(
	page: Page,
	path: string[],
	x: number,
	y: number,
) {
	await centerOnPoint(page, x, y);
	await page.waitForTimeout(200);
	const canvasSize = await page.locator("#graph-canvas").boundingBox();
	await page.locator("#graph-canvas").click({
		position: {
			x: canvasSize!.width / 2,
			y: canvasSize!.height / 2,
		},
		button: "right",
	});

	await page.getByRole("menuitem", { name: "Add node" }).first().click();

	for (const p of path) {
		const menu = await page.locator(".litecontextmenu").last();
		await menu.getByText(p, { exact: true }).click();
	}
}

export class NodeRef {
	readonly id: number | string;
	readonly page: Page;
	tag?: string;

	delay: number = 100;

	constructor(id: number | string, page: Page, tag?: string) {
		this.page = page;
		this.id = id;
		this.tag = tag;
	}

	async clickWidget(name: string) {
		const { view, pos, widgetPos, size } = await this.page.evaluate(
			async ([nodeId, name]) => {
				const view: [number, number, number, number] =
					window.app.canvas.visible_area;
				const node = app.graph.getNodeById(nodeId);
				await window.graph.primaryCanvas.centerOnNode(node);
				await new Promise((resolve) => setTimeout(resolve, 200));
				const pos: [number, number, number, number] = node._posSize;
				const widget = node.widgets.find((w) => w.name === name);
				if (!widget) {
					throw new Error(`Widget not found: ${name}`);
				}
				const widgetPos: number = widget.y;

				const canvas = window.app.canvas.canvas.getBoundingClientRect();
				const size = {
					width: canvas.width,
					height: canvas.height,
				};

				return { view, pos, widgetPos, size };
			},
			[this.id, name],
		);

		const getPos = ([x, y]: [number, number]) => {
			// view: [viewX, viewY, viewWidth, viewHeight]
			// size: { width, height }
			const [viewX, viewY, viewWidth, viewHeight] = view;
			const { width: canvasWidth, height: canvasHeight } = size;

			const canvasX = ((x - viewX) / viewWidth) * canvasWidth;
			const canvasY = ((y - viewY) / viewHeight) * canvasHeight;

			return [canvasX, canvasY];
		};

		// try and click the widget
		const widgetX = pos[0] + pos[2] / 2;
		const widgetY = pos[1] + widgetPos + 10;
		const [clickX, clickY] = getPos([widgetX, widgetY]);

		await this.page
			.locator("#graph-canvas")
			.click({ position: { x: clickX, y: clickY } });
	}

	async isWidgetVisible(name: string);
	async isWidgetVisible(names: string[]);
	async isWidgetVisible(arg: string | string[]) {
		const names = Array.isArray(arg) ? arg : [arg];

		const widgets = await this.page.evaluate(
			async ([nodeId, names, delay]) => {
				await new Promise((resolve) => setTimeout(resolve, delay));
				const node = app.graph.getNodeById(nodeId);
				const isVisible: boolean[] = [];
				for (const name of names) {
					const w = node.widgets.find((w) => w.name === name);
					if (!w || w.hidden) {
						isVisible.push(false);
						continue;
					}
					isVisible.push(true);
				}
				return isVisible;
			},
			[this.id, names, this.delay],
		);

		if (Array.isArray(arg)) {
			return widgets;
		} else {
			return widgets[0];
		}
		return widgets.every((v) => v === true);
	}

	async getVisibleWidgets(): Promise<string[]> {
		const widgets = await this.page.evaluate(
			async ([nodeId, delay]) => {
				await new Promise((resolve) => setTimeout(resolve, delay));
				const node = app.graph.getNodeById(nodeId);
				const widgetNames = node.widgets
					.filter((w) => !w.hidden)
					.map((w) => w.name);
				return widgetNames;
			},
			[this.id, this.delay],
		);

		return widgets;
	}

	async isWidgetDisabled(name: string);
	async isWidgetDisabled(names: string[]);
	async isWidgetDisabled(arg: string | string[]) {
		const names = Array.isArray(arg) ? arg : [arg];

		const widgets = await this.page.evaluate(
			async ([nodeId, names, delay]) => {
				await new Promise((resolve) => setTimeout(resolve, delay));
				const node = app.graph.getNodeById(nodeId);
				const isDisabled: boolean[] = [];
				for (const name of names) {
					const w = node.widgets.find((w) => w.name === name);
					if (!w || w.disabled !== true) {
						isDisabled.push(false);
						continue;
					}
					isDisabled.push(true);
				}
				return isDisabled;
			},
			[this.id, names, this.delay],
		);

		if (Array.isArray(arg)) {
			return widgets;
		} else {
			return widgets[0];
		}
	}

	async getWidgetValue(name: string) {
		return await this.page.evaluate(
			([nodeId, name]) => {
				const node = app.graph.getNodeById(nodeId);
				const widget = node.widgets.find((w) => w.name === name);
				if (!widget) throw new Error(`Widget not found: ${name}`);
				return widget.value;
			},
			[this.id, name],
		);
	}

	async getAllWidgetValues(): Promise<Record<string, unknown>> {
		return await this.page.evaluate(
			([nodeId]) => {
				const node = app.graph.getNodeById(nodeId);
				const values = node?.widgets?.reduce((acc, v) => {
					acc[v.name] = v.value;
					return acc;
				}, {});
				return values;
			},
			[this.id],
		);
	}

	async selectWidgetOption(widget: string, option: string | RegExp) {
		await this.clickWidget(widget);
		const item = await this.page
			.getByRole("menuitem", { name: option })
			.first();
		await item.scrollIntoViewIfNeeded();
		await item.click({ position: { x: 2, y: 2 } });
		await this.page.waitForTimeout(this.delay);
	}

	async setWidgetValue(widget: string, value: number) {
		await this.clickWidget(widget);
		await this.page.locator("*:focus").fill(String(value));
		await this.page.locator("*:focus").press("Enter");
		// await this.page.locator('.graphdialog>textbox').fill(String(value))
		// await this.page.locator('.graphdialog>textbox').press('Enter')
	}

	async getNodeColor() {
		throw new Error("not yet implemented");
	}

	async connectOutput(output: string, node: NodeRef, input: string) {
		throw new Error("not yet implemented");
	}

	async disconnectInput(inputName: string) {
		const { view, pos, inputBox, size } = await this.page.evaluate(
			([nodeId, inputName]) => {
				const view: [number, number, number, number] =
					window.app.canvas.visible_area;
				const node = app.graph.getNodeById(nodeId);
				const pos: [number, number, number, number] = node._posSize;
				const input = node.inputs.find((o) => o.name === inputName);
				if (!input) {
					throw new Error(`Input not found: ${inputName}`);
				}
				const inputBox: number = input.boundingRect;

				const canvas = window.app.canvas.canvas.getBoundingClientRect();
				const size = {
					width: canvas.width,
					height: canvas.height,
				};

				return { view, pos, inputBox, size };
			},
			[this.id, inputName],
		);

		const getPos = ([x, y]: [number, number]) => {
			// view: [viewX, viewY, viewWidth, viewHeight]
			// size: { width, height }
			const [viewX, viewY, viewWidth, viewHeight] = view;
			const { width: canvasWidth, height: canvasHeight } = size;

			const canvasX = ((x - viewX) / viewWidth) * canvasWidth;
			const canvasY = ((y - viewY) / viewHeight) * canvasHeight;

			return [canvasX, canvasY];
		};

		// try and click the output
		const inputX = inputBox[0] + inputBox[2] / 2;
		const outputY = inputBox[1] + inputBox[3] / 2;
		const [clickX, clickY] = getPos([inputX, outputY]);

		await this.page
			.locator("#graph-canvas")
			.click({ position: { x: clickX, y: clickY }, button: "right" });

		const item = await this.page
			.getByRole("menuitem", { name: "Disconnect Links" })
			.first();
		await item.scrollIntoViewIfNeeded();
		await item.click({ position: { x: 2, y: 2 } });
		await this.page.waitForTimeout(this.delay);
	}

	async getWidgetOptions(widget: string): Promise<(string | null)[]> {
		const options = (await this.page.evaluate(
			([nodeId, name]) => {
				const node = app.graph.getNodeById(nodeId);
				const widget = node.widgets.find((w) => w.name === name);
				if (!widget) throw new Error(`Widget not found: ${name}`);
				return widget.options.values;
			},
			[this.id, widget],
		)) as unknown[];

		return options.map((o) => {
			if (typeof o === "string") return o;
			if (o && typeof o === "object" && "content" in o)
				return o?.content as string;
			return String(o) || null;
		});
	}

	async widgetHasOption(widget: string, option: string, useApi = false) {
		if (useApi) {
			const result = await this.page.evaluate(
				([nodeId, name, option]) => {
					const node = app.graph.getNodeById(nodeId);
					const widget = node?.widgets?.find((w) => w.name === name);
					if (!widget) throw new Error(`Widget not found: ${name}`);
					if (!widget.options || !Array.isArray(widget.options.values))
						throw new Error("wrong widget type");
					const values = widget.options.values.map((v) => v.content);
					return values.includes(option);
				},
				[this.id, widget, option] as const,
			);
			return result;
		}
		// const options = await this.getWidgetOptions(widget)

		// return options.some(o => o === option)
		await this.clickWidget(widget);

		const hasOption = await this.page
			.getByRole("menuitem", { name: option })
			.isVisible();
		await this.page
			.locator(".side-tool-bar-container > .flex.flex-col.h-full")
			.click();
		await this.page.waitForTimeout(this.delay);
		return hasOption;
	}

	async centerNode() {
		await this.page.evaluate(
			async ([nodeId]) => {
				const node = app.graph.getNodeById(nodeId);
				app.canvas.selectNode(node);
				await new Promise((resolve) => setTimeout(resolve, 200));
			},
			[this.id],
		);

		await this.page.locator("#graph-canvas").press(".");

		await wait(400);
	}

	async addOutputNode(outputName: string, nodeName: string) {
		const { view, pos, outputBox, size } = await this.page.evaluate(
			([nodeId, outputName]) => {
				const view: [number, number, number, number] =
					window.app.canvas.visible_area;
				const node = app.graph.getNodeById(nodeId);
				const pos: [number, number, number, number] = node._posSize;
				const output = node.outputs.find((o) => o.name === outputName);
				if (!output) {
					throw new Error(`Output not found: ${outputName}`);
				}
				const outputBox: number = output.boundingRect;

				const canvas = window.app.canvas.canvas.getBoundingClientRect();
				const size = {
					width: canvas.width,
					height: canvas.height,
				};

				return { view, pos, outputBox, size };
			},
			[this.id, outputName],
		);

		const getPos = ([x, y]: [number, number]) => {
			// view: [viewX, viewY, viewWidth, viewHeight]
			// size: { width, height }
			const [viewX, viewY, viewWidth, viewHeight] = view;
			const { width: canvasWidth, height: canvasHeight } = size;

			const canvasX = ((x - viewX) / viewWidth) * canvasWidth;
			const canvasY = ((y - viewY) / viewHeight) * canvasHeight;

			return [canvasX, canvasY];
		};

		// try and click the output
		const outputX = outputBox[0] + outputBox[2] / 2;
		const outputY = outputBox[1] + outputBox[3] / 2;
		const [clickX, clickY] = getPos([outputX, outputY]);

		await this.page
			.locator("#graph-canvas")
			.hover({ position: { x: clickX, y: clickY } });
		await this.page.mouse.down();
		await this.page
			.locator("#graph-canvas")
			.hover({ position: { x: clickX + 50, y: clickY } });
		await this.page.mouse.up();
		await this.page.getByRole("menuitem", { name: "Search" }).click();
		await this.page.keyboard.type(nodeName);

		await this.page.getByLabel("Option List").getByText(nodeName).click();
	}

	async openContextMenu() {
		const { view, pos, size } = await this.page.evaluate(
			([nodeId]) => {
				const view: [number, number, number, number] =
					window.app.canvas.visible_area;
				const node = app.graph.getNodeById(nodeId);
				const pos: [number, number, number, number] = node._posSize;

				const canvas = window.app.canvas.canvas.getBoundingClientRect();
				const size = {
					width: canvas.width,
					height: canvas.height,
				};

				return { view, pos, size };
			},
			[this.id],
		);

		const getPos = ([x, y]: [number, number]) => {
			// view: [viewX, viewY, viewWidth, viewHeight]
			// size: { width, height }
			const [viewX, viewY, viewWidth, viewHeight] = view;
			const { width: canvasWidth, height: canvasHeight } = size;

			const canvasX = ((x - viewX) / viewWidth) * canvasWidth;
			const canvasY = ((y - viewY) / viewHeight) * canvasHeight;

			return [canvasX, canvasY];
		};

		// try and click the center top of the node
		const targetX = pos[0] + pos[2] / 2;
		const targetY = pos[1] + 10;
		const [clickX, clickY] = getPos([targetX, targetY]);

		await this.page.locator("#graph-canvas").click({
			position: { x: clickX, y: clickY },
			button: "right",
			// force: true,
		});
	}

	async getContextMenuOptions() {
		await this.openContextMenu();
		const locators = await this.page
			.getByRole("menuitem", { name: /.*?/ })
			.all();
		await this.page.waitForTimeout(this.delay);
		const options = Promise.all(
			locators.map(async (o) => await o.textContent()),
		);

		// to close the menu
		await this.page
			.locator(".side-tool-bar-container > .flex.flex-col.h-full")
			.click();

		return options;
	}

	async selectContextMenuOption(option: string | RegExp) {
		await this.openContextMenu();
		const item = await this.page
			.getByRole("menuitem", { name: option })
			.first();
		await item.scrollIntoViewIfNeeded();
		await item.click({ position: { x: 2, y: 2 } });
		await this.page.waitForTimeout(this.delay);
	}
}

async function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
