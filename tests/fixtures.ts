import "dotenv/config";
import { Locator, Page, test as base, expect } from "@playwright/test";
import { NodeRef } from "./nodeRef";
import fse from "fs-extra";
import { join } from "path";

if (!process.env.PLAYWRIGHT_TEST_URL)
	throw new Error("PLAYWRIGHT_TEST_URL is not set");
export const DEFAULT_WORKFLOW_FOLDER = "./tests/workflows";

export class ComfyPage {
	readonly canvas: Locator;
	readonly url: string;
	private queryParam: [string, string];
	private gotoCalled = false;
	private readonly teardownTasks: (() => Promise<void>)[] = [];

	constructor(public readonly page: Page) {
		this.canvas = page.locator("#graph-canvas");

		if (!process.env.PLAYWRIGHT_TEST_URL) {
			throw new Error("PLAYWRIGHT_TEST_URL is not set");
		}
		this.url = process.env.PLAYWRIGHT_TEST_URL;
	}

	addUrlQuery(query: string, value: string) {
		this.queryParam = [query, value];
	}

	async goto() {
		const url = new URL(this.url);
		if (this.queryParam) {
			url.searchParams.set(this.queryParam[0], this.queryParam[1]);
		}
		await this.page.goto(url.toString());
		this.gotoCalled = true;

		const bannerClose = this.page.locator(
			'xpath=//*[@id="graph-canvas-container"]/div[2]/div[1]/button',
		);
		await bannerClose
			.waitFor({ state: "visible", timeout: 3000 })
			.catch(() => {});
		if (await bannerClose.isVisible()) await bannerClose.click();
	}

	async openWorkflow(workflowPath: string) {
		if (!this.gotoCalled) {
			await this.goto();
		}

		// Expect a title "to contain" a substring.
		await expect(this.page).toHaveTitle(/ComfyUI/);

		const fileChooserPromise = this.page.waitForEvent("filechooser");

		await this.page.locator("#graph-canvas").press("Control+o");
		// await this.page.locator(".comfy-menu-button-wrapper").click();

		// // some times this works with hover, and sometimes it takes a click
		// await this.page
		//     .getByRole("menuitem", { name: "File" })
		//     .locator("a")
		//     .hover();
		// // await this.page.locator('a').filter({ hasText: 'File' }).click();
		// if (!(await this.page.getByText("OpenCtrl + o").isVisible()))
		//     await this.page
		//         .getByRole("menuitem", { name: "File" })
		//         .locator("a")
		//         .click();

		// await this.page.getByText("OpenCtrl + o").click();

		const fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(resolveWorkflow(workflowPath));

		await this.page.locator("#graph-canvas").click({
			position: {
				x: 137,
				y: 246,
			},
		});

		await this.page.waitForTimeout(200);
		await this.page.locator("#graph-canvas").press(".");
		await this.page.waitForTimeout(500);
	}

	async getNodeRef(
		node: number | string | ((node) => boolean),
		options?: {
			doNotThrow?: boolean;
			tag?: string;
		},
	) {
		const nodeId = await this.page.evaluate((node) => {
			if (typeof node === "number") {
				return window.app.graph._nodes.find((n) => n.id === node)?.id;
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

		return new NodeRef(nodeId, this.page, options?.tag);
	}

	async addNode(path: string[], x: number, y: number) {
		const beforeNodes = await this.getAllNodes();
		await this.centerOnPoint(x, y);
		await this.page.waitForTimeout(200);
		const canvasSize = await this.canvas.boundingBox();
		await this.canvas.click({
			position: {
				x: canvasSize!.width / 2,
				y: canvasSize!.height / 2,
			},
			button: "right",
		});

		await this.page.getByRole("menuitem", { name: "Add node" }).first().click();

		for (const p of path) {
			const menu = await this.page.locator(".litecontextmenu").last();
			await menu.getByText(p, { exact: true }).click();
		}

		const afterNodes = await this.getAllNodes();

		const newNode = afterNodes.find(
			(n) => !beforeNodes.map((n) => n.id).includes(n.id),
		);
		if (!newNode) {
			throw new Error("add node failed");
		}
		return new NodeRef(newNode.id, this.page);
	}

	async centerOnPoint(x: number, y: number, scale = 1) {
		await this.page.evaluate(
			async ([x, y, scale]) => {
				if (!window.app?.canvas.ds) return;
				window.app.canvas.ds.scale = 1;
				const [_x, _y, w, h] = window.app.canvas.visible_area;
				window.app.canvas.ds.offset = [x + w / 2, y + h / 2];
				window.app.canvas.setDirty(true, true);
				await new Promise((resolve) => setTimeout(resolve, 200));
			},
			[x, y, scale],
		);
	}

	async createNewWorkflow() {
		if (!this.gotoCalled) await this.goto();

		await this.page.locator("#graph-canvas").press("Control+n");
		await this.page.waitForTimeout(1000);
	}

	async getAllNodes() {
		return this.page.evaluate(() => {
			return window.app.graph._nodes.map((n) => {
				const { id, type, pos, size, title } = n;
				return { id, type, pos, size, title };
			});
		});
	}

	async exportWorkflow() {
		await this.page.locator("#graph-canvas").press("Control+e");
		await this.page.getByRole("textbox").click();
		await this.page.getByRole("textbox").press("ControlOrMeta+a");
		await this.page.getByRole("textbox").fill("workflow");
		const downloadPromise = this.page.waitForEvent("download");
		await this.page.getByRole("button", { name: "Confirm" }).click();
		const download = await downloadPromise;

		const tempDir = await this.getTempDir();
		await download.saveAs(join(tempDir, "workflow.json"));

		const workflow = await fse.readJSON(join(tempDir, "workflow.json"));
		return workflow;
	}

	async setClipboard(data: string | Record<string, unknown>) {
		const cliptext = typeof data === "string" ? data : JSON.stringify(data);
		await this.page.addInitScript((text) => {
			Object.defineProperty(navigator, "clipboard", {
				value: {
					readText: () => Promise.resolve(text),
					writeText: (t: string) => Promise.resolve(), // optional stub
				},
			});
		}, cliptext);
	}

	async getTempDir() {
		const tempDir = await fse.mkdtemp("comfyui-dt-grpc-test-data-");
		this.teardownTasks.push(() => fse.remove(tempDir));
		return tempDir;
	}

	async teardown() {
		for (const task of this.teardownTasks) {
			try {
				await task();
			} catch (e) {
				console.warn(e);
			}
		}
	}

	async clearUserData() {
		const dir = join(
			process.env.TEST_COMFYUI_DIR,
			"user/default/drawthings-grpc",
		);
		await fse.emptyDir(dir);
	}

	async updateSetting(setting: string, value: unknown) {
		await this.page.evaluate(
			([setting, value]) => {
				window.app.extensionManager.setting.set(setting, value);
			},
			[setting, value] as const,
		);
	}
}

type ComfyFixtures = {
	comfy: ComfyPage;
	forEachTest: void;
};

export const test = base.extend<ComfyFixtures>({
	comfy: async ({ page }, use) => {
		await use(new ComfyPage(page));
	},
	forEachTest: [
		async ({ comfy }, use) => {
			await use();
			await comfy.teardown();
		},
		{ auto: true },
	],
});

function resolveWorkflow(workflow: string) {
	if (workflow.includes(".json")) return workflow;
	else return join(DEFAULT_WORKFLOW_FOLDER, `${workflow}.json`);
}
