import "dotenv/config";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { getNodeRef, type NodeRef } from "./nodeRef";

const comfyUrl = process.env.PLAYWRIGHT_TEST_URL || "";
if (!comfyUrl) throw new Error("PLAYWRIGHT_TEST_URL is not set");

export const workflowFolder = "./tests/workflows";

test.beforeAll(async ({ comfy }) => {
	await comfy.goto();
	await comfy.updateSetting("drawthings.bridge_mode.enabled", false);
});

test("widget change when settings mode changes", async ({ page, comfy }) => {
	await comfy.openWorkflow(join(workflowFolder, "node.json"));

	const nodeRef = await getNodeRef(page, "DrawThingsSampler");

	// "model" on basic and advanced
	// "strength" on basic
	// "clip_skip" on advanced

	expect(await nodeRef.isWidgetVisible("settings")).toBeTruthy();

	// start on basic
	await nodeRef.clickWidget("settings");
	await page.getByRole("menuitem", { name: "Basic" }).click();
	expect(
		await nodeRef.isWidgetVisible([
			"settings",
			"model",
			"strength",
			"clip_skip",
		]),
	).toMatchObject([true, true, true, false]);

	// go to advanced
	await nodeRef.clickWidget("settings");
	await page.getByRole("menuitem", { name: "Advanced" }).click();
	expect(
		await nodeRef.isWidgetVisible([
			"settings",
			"model",
			"strength",
			"clip_skip",
		]),
	).toMatchObject([true, true, false, true]);

	// go to all
	await nodeRef.clickWidget("settings");
	await page.getByRole("menuitem", { name: "All" }).click();

	expect(
		await nodeRef.isWidgetVisible([
			"settings",
			"model",
			"strength",
			"clip_skip",
		]),
	).toMatchObject([true, true, true, true]);
});

test("tcd sampler", async ({ page, comfy }) => {
	await comfy.openWorkflow(join(workflowFolder, "node.json"));

	const node = await getNodeRef(page, "DrawThingsSampler");
	await node.selectWidgetOption("settings", "Basic");
	await page.waitForTimeout(500);

	// select euler
	await node.selectWidgetOption("sampler_name", "Euler A");

	// assert stochastic sampling gamma is not visible
	expect(await node.isWidgetVisible("stochastic_sampling_gamma")).toBeFalsy();

	// select tcd
	await node.selectWidgetOption("sampler_name", "TCD");

	// assert stochastic sampling gamma appears
	expect(await node.isWidgetVisible("stochastic_sampling_gamma")).toBeTruthy();

	// select euler
	await node.selectWidgetOption("sampler_name", "Euler A");

	// assert stochastic sampling gamma is not visible
	expect(await node.isWidgetVisible("stochastic_sampling_gamma")).toBeFalsy();
});

test("hires, tiled diffusion, tiled decoding widgets", async ({
	page,
	comfy,
}) => {
	await comfy.openWorkflow(join(workflowFolder, "node.json"));

	const nodeRef = await getNodeRef(page, "DrawThingsSampler");

	// go to advanced
	await nodeRef?.selectWidgetOption("settings", "Advanced");

	await testDependentOptions(nodeRef, "high_res_fix", [
		"high_res_fix_start_width",
		"high_res_fix_start_height",
		"high_res_fix_strength",
	]);

	await testDependentOptions(nodeRef, "tiled_diffusion", [
		"diffusion_tile_width",
		"diffusion_tile_height",
		"diffusion_tile_overlap",
	]);

	await testDependentOptions(nodeRef, "tiled_decoding", [
		"decoding_tile_width",
		"decoding_tile_height",
		"decoding_tile_overlap",
	]);
});

test("flux settings widgets", async ({ page, comfy }) => {
	await comfy.openWorkflow(join(workflowFolder, "node.json"));

	const node = await getNodeRef(page, "DrawThingsSampler");
	if (!node) throw new Error("Node ref not found");

	// go to basic
	await node.clickWidget("settings");
	await page.getByRole("menuitem", { name: "Basic" }).click();

	// select an sd model
	await node.clickWidget("model");
	await page
		.getByRole("menuitem", { name: /\(SD\)/ })
		.first()
		.click();

	// make sure flux widgets are not visible
	expect(await node.isWidgetVisible("res_dpt_shift")).toBeFalsy();
	expect(await node.isWidgetVisible("cfg_zero_star")).toBeFalsy();

	await node.selectWidgetOption("settings", "Advanced");
	expect(
		await node.isWidgetVisible(["tea_cache", "speed_up", "separate_clip_l"]),
	).toMatchObject([false, false, false]);

	// select flux model
	await node.selectWidgetOption("model", /\(F1\)/);

	await node.selectWidgetOption("settings", "Advanced");
	expect(
		await node.isWidgetVisible(["tea_cache", "speed_up", "separate_clip_l"]),
	).toMatchObject([true, true, true]);

	// test tea_cache
	await testDependentOptions(node, "tea_cache", [
		"tea_cache_start",
		"tea_cache_end",
		"tea_cache_threshold",
		"tea_cache_max_skip_steps",
	]);

	// test speed_up
	await testDependentOptions(node, "speed_up", ["guidance_embed"], "invert");

	// test separate_clip_l
	await testDependentOptions(node, "separate_clip_l", ["clip_l_text"]);

	await node.selectWidgetOption("settings", "Basic");

	await testDependentOptions(node, "res_dpt_shift", ["shift"], "disable");

	await testDependentOptions(node, "cfg_zero_star", ["cfg_zero_star_init_steps"]);
});

test("qwen settings widgets", async ({ page, comfy }) => {
	comfy.addUrlQuery("dtgrpctesthack", "true");
	await comfy.openWorkflow(join(workflowFolder, "node.json"));

	const node = await getNodeRef(page, "DrawThingsSampler");
	if (!node) throw new Error("Node ref not found");

	// go to basic
	await node.clickWidget("settings");
	await page.getByRole("menuitem", { name: "Basic" }).click();

	// select an sd model
	await node.clickWidget("model");
	await page
		.getByRole("menuitem", { name: /\(SD\)/ })
		.first()
		.click();

	// make sure flux widgets are not visible
	expect(await node.isWidgetVisible("res_dpt_shift")).toBeFalsy();
	expect(await node.isWidgetVisible("cfg_zero_star")).toBeFalsy();

	// select qwen model
	await node.selectWidgetOption("model", /\(Qwen\)/);

	await testDependentOptions(node, "res_dpt_shift", ["shift"], "disable");

	await testDependentOptions(node, "cfg_zero_star", ["cfg_zero_star_init_steps"]);
});

test("svd options", async ({ page, comfy }) => {});

test("wan options", async ({ page, comfy }) => {
	comfy.addUrlQuery("dtgrpctesthack", "true");
	await comfy.openWorkflow(join(workflowFolder, "node.json"));

	const node = await getNodeRef(page, "DrawThingsSampler");
	if (!node) throw new Error("Node ref not found");

	// go to basic
	await node.clickWidget("settings");
	await page.getByRole("menuitem", { name: "Basic" }).click();

	// select an sd model
	await node.clickWidget("model");
	await page
		.getByRole("menuitem", { name: /\(SD\)/ })
		.first()
		.click();

	// make sure wan widgets are not visible
	expect(await node.isWidgetVisible("cfg_zero_star")).toBeFalsy();

	await node.selectWidgetOption("settings", "Advanced");
	expect(
		await node.isWidgetVisible([
			"causal_inference",
			"causal_inference_pad",
			"tea_cache",
		]),
	).toMatchObject([false, false, false]);

	// select wan model
	await node.selectWidgetOption("model", /Wan/);

	// assert widgets appear
	expect(
		await node.isWidgetVisible([
			"causal_inference",
			"causal_inference_pad",
			"tea_cache",
		]),
	).toMatchObject([true, true, true]);

	// test tea_cache
	await testDependentOptions(node, "tea_cache", [
		"tea_cache_start",
		"tea_cache_end",
		"tea_cache_threshold",
		"tea_cache_max_skip_steps",
	]);

	await node.selectWidgetOption("settings", "Basic");
	await testDependentOptions(node, "cfg_zero_star", [
		"cfg_zero_star_init_steps",
	]);
});

test("no widget shows [object Object]", async ({ page, comfy }) => {
	await comfy.openWorkflow(join(workflowFolder, "all_nodes.json"));

	// assert connected
	const sampler = await comfy.getNodeRef("DrawThingsSampler");
	const modelValue = (await sampler?.getWidgetValue("model")) as string;
	await expect(modelValue?.value?.name).toBe("Stable Diffusion v1.5");

	const allValues = await page.evaluate(() => {
		return window.graph.nodes
			.flatMap((n) => n.widgets)
			.map((w) => w.value.toString());
	});

	// make sure we actually got some values
	expect(allValues.length).toBeGreaterThan(20);
	// assert no [object Object]
	expect(allValues).not.toContain("[object Object]");

	// disconnect and assert
	await sampler?.clickWidget("use_tls");
	await page.waitForTimeout(1000);
	await expect(await sampler?.getWidgetValue("model")).toBe("Not connected");

	// refresh
	await page.reload();
	await page.waitForLoadState("domcontentloaded");
	await page.waitForTimeout(2000);

	// assert no widget says [object Object]
	const allValues2 = await page.evaluate(() => {
		return window.graph.nodes
			.flatMap((n) => n.widgets)
			.map((w) => w.value.toString());
	});

	// make sure we actually got some values
	expect(allValues2.length).toBeGreaterThan(20);
	// assert no [object Object]
	expect(allValues2).not.toContain("[object Object]");
});

test("version specific settings appear when loaded with disconnected server", async ({
	page,
	comfy,
}) => {
	// this is mostly copied from flux test above
	await comfy.openWorkflow(join(workflowFolder, "node.json"));

	const sampler = await getNodeRef(page, "DrawThingsSampler");
	if (!sampler) throw new Error("Node ref not found");

	// go to advanced settings
	await sampler.selectWidgetOption("settings", "Advanced");
	// await page.waitForTimeout(1000);

	// select flux model and assert options appear
	await sampler.selectWidgetOption("model", /\(F1\)/);
	expect(
		await sampler.isWidgetVisible(["tea_cache", "speed_up", "separate_clip_l"]),
	).toMatchObject([true, true, true]);

	// toggle tls to disconnect
	await sampler.selectWidgetOption("settings", "Basic");
	await sampler?.clickWidget("use_tls");
	await page.waitForTimeout(1000);
	await expect(await sampler?.getWidgetValue("model")).toBe("Not connected");

	// refresh
	await page.reload();
	await page.waitForLoadState("domcontentloaded");
	await page.waitForTimeout(2000);

	// assert not connect
	await expect(await sampler?.getWidgetValue("model")).toBe("Not connected");

	// assert flux specific settings are still listed
	await sampler.selectWidgetOption("settings", "Advanced");
	expect(
		await sampler.isWidgetVisible(["tea_cache", "speed_up", "separate_clip_l"]),
	).toMatchObject([true, true, true]);
});

async function testDependentOptions(
	node: NodeRef,
	primary: string,
	dependents: string[],
	mode: "normal" | "invert" | "disable" = "normal",
) {
	const allTrue = new Array(dependents.length).fill(mode !== "invert");
	const allFalse = new Array(dependents.length).fill(mode === "invert");

	const check =
		mode === "disable"
			? (...args: Parameters<NodeRef["isWidgetDisabled"]>) =>
					node.isWidgetDisabled(...args)
			: (...args: Parameters<NodeRef["isWidgetVisible"]>) =>
					node.isWidgetVisible(...args);

	expect(await node.isWidgetVisible(primary)).toBeTruthy();

	if (await node.getWidgetValue(primary)) {
		// make sure option is off
		await node.clickWidget(primary);
	}
	expect(await node.getWidgetValue(primary)).toBeFalsy();

	// assert dependents are not visible
	expect(await check(dependents)).toMatchObject(allFalse);

	// turn option on
	await node.clickWidget(primary);
	expect(await node.getWidgetValue(primary)).toBeTruthy();

	// assert dependents are visible
	expect(await check(dependents)).toMatchObject(allTrue);

	// turn it back off
	await node.clickWidget(primary);
	expect(await node.getWidgetValue(primary)).toBeFalsy();

	// assert dependents are not visible
	expect(await check(dependents)).toMatchObject(allFalse);
}
