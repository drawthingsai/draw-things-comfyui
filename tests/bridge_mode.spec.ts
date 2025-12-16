import "dotenv/config";
import { expect } from "@playwright/test";
import { ComfyPage, test } from "./fixtures";

// import fse from "fs-extra";
// import { join } from "node:path";

const localOnlyModels = [
	"animyo (SD)",
	"LoRA-001 (2000) (SD)",
	"control-lora-openposeXL2-rank256 (SDXL)",
	"LoRA-001 (2000) (v1)",
	// "Real-ESRGAN X2+",
	"animyo (SD)",
] as const;

const officialModels = [
	"HiDream E1-1 (HiD)",
	"Foreground to Blending (SDXL)",
	"QR Code (SD v1.x, ControlNet Monster 2.0) (SD)",
	"NONE OFFICIAL",
	// "4x UltraSharp",
	"Kandinsky v2.1 (Kan)",
] as const;

const communityModels = [
	"Chroma1 HD (F1)",
	"Arcane Style (SD)",
	"Depth Map (Kwai Kolors 1.0) (SDXL)",
	"Action Helper (v2)",
	"RayFLUX v3.0 (F1)",
] as const;

const [menuBridge, menuCommunity, menuUncurated] = [
	"Use bridge mode",
	"Show community models",
	"Show uncurated models",
].map((o) => ({ true: `✓ ${o}`, false: o }));

test.beforeEach(async ({ comfy }) => {
	// make sure default settings are enabled
	await comfy.goto();

	await comfy.updateSetting("drawthings.bridge_mode.enabled", false);
	await comfy.updateSetting("drawthings.bridge_mode.community", true);
	await comfy.updateSetting("drawthings.bridge_mode.uncurated", false);
});

test("When bridge mode is enabled, local models are hidden and official models are listed", async ({
	comfy,
}) => {
	await comfy.openWorkflow("all_nodes");

	const sampler = await comfy.getNodeRef("DrawThingsSampler");
	const checkAllNodesModels = await getCheckAllNodesModels(comfy);

	// make sure bridge mode is off
	let menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions?.includes(menuBridge.false)).toBeTruthy();

	// assert local models are listed
	let result = await checkAllNodesModels(...localOnlyModels);
	expect(result).toMatchObject([true, true, true, true, true]);

	// enable bridge mode through context menu
	await comfy.updateSetting("drawthings.bridge_mode.enabled", true);
	await comfy.page.waitForTimeout(2000);
	menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions?.includes(menuBridge.true)).toBeTruthy();

	// assert local models are gone, and official models are listed
	result = await checkAllNodesModels(...localOnlyModels);
	expect(result).toMatchObject([false, false, false, false, false]);
	result = await checkAllNodesModels(...officialModels);
	expect(result).toMatchObject([true, true, true, false, true]);

	// disable bridge mode through context menu
	await comfy.updateSetting("drawthings.bridge_mode.enabled", false);
	await comfy.page.waitForTimeout(2000);
	menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions?.includes(menuBridge.false)).toBeTruthy();

	// assert local models are back, an official models are gone
	result = await checkAllNodesModels(...officialModels);
	expect(result).toMatchObject([false, false, false, false, false]);
	result = await checkAllNodesModels(...localOnlyModels);
	expect(result).toMatchObject([true, true, true, true, true]);
});

test('When "show community" is enabled, official and community models are listed', async ({
	comfy,
}) => {
	await comfy.openWorkflow("all_nodes");

	const sampler = await comfy.getNodeRef("DrawThingsSampler");
	const checkAllNodesModels = await getCheckAllNodesModels(comfy);

	// turn bridge mode on
	await comfy.updateSetting("drawthings.bridge_mode.enabled", true);
	await comfy.page.waitForTimeout(2000);
	let menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions?.includes(menuCommunity.true)).toBeTruthy();

	// assert official models are listed
	let result = await checkAllNodesModels(...officialModels);
	expect(result).toMatchObject([true, true, true, false, true]);

	// assert community models are listed
	result = await checkAllNodesModels(...communityModels);
	expect(result).toMatchObject([true, true, true, true, true]);

	// disable community
	await comfy.updateSetting("drawthings.bridge_mode.community", false);
	await comfy.page.waitForTimeout(2000);
	menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions?.includes(menuCommunity.true)).toBeFalsy();

	// assert community is not listed
	result = await checkAllNodesModels(...communityModels);
	expect(result).toMatchObject([false, false, false, false, false]);

	// enable community
	await comfy.updateSetting("drawthings.bridge_mode.community", true);
	await comfy.page.waitForTimeout(2000);
	menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions?.includes(menuCommunity.true)).toBeTruthy();

	// assert community is listed
	result = await checkAllNodesModels(...communityModels);
	expect(result).toMatchObject([true, true, true, true, true]);
});

test('When "show uncurated" is enabled, official and uncurated models are listed', async ({
	comfy,
}) => {
	await comfy.openWorkflow("all_nodes");

	const sampler = await comfy.getNodeRef("DrawThingsSampler");

	// turn bridge mode on
	await comfy.updateSetting("drawthings.bridge_mode.enabled", true);
	await comfy.page.waitForTimeout(2000);
	let menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions?.includes(menuUncurated.true)).toBeFalsy();

	// assert uncurated model not listed
	let result = await sampler?.widgetHasOption(
		"model",
		"Photonic-Fusion-SDXL (SDXL)",
	);
	expect(result).toBeFalsy();

	// turn uncurated models on
	await comfy.updateSetting("drawthings.bridge_mode.uncurated", true);
	await comfy.page.waitForTimeout(2000);
	menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions?.includes(menuUncurated.true)).toBeTruthy();

	// assert uncurated model is listed
	result = await sampler?.widgetHasOption(
		"model",
		"Photonic-Fusion-SDXL (SDXL)",
	);
	expect(result).toBeTruthy();

	// turn uncurated models off
	await comfy.updateSetting("drawthings.bridge_mode.uncurated", false);
	await comfy.page.waitForTimeout(2000);
	menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions?.includes(menuUncurated.true)).toBeFalsy();

	// assert uncurated model is not listed
	result = await sampler?.widgetHasOption(
		"model",
		"Photonic-Fusion-SDXL (SDXL)",
	);
	expect(result).toBeFalsy();
});

test('When "show community" and "show uncurated" are enabled, all three categories are listed', async ({
	comfy,
}) => {
	await comfy.openWorkflow("all_nodes");

	const sampler = await comfy.getNodeRef("DrawThingsSampler");
	const checkAllNodesModels = await getCheckAllNodesModels(comfy);

	// turn bridge mode on
	await comfy.updateSetting("drawthings.bridge_mode.enabled", true);
	await comfy.page.waitForTimeout(2000);

	// ensure community is enabled
	await comfy.updateSetting("drawthings.bridge_mode.community", true);
	await comfy.page.waitForTimeout(2000);

	// ensure uncurated is enabled
	await comfy.updateSetting("drawthings.bridge_mode.uncurated", true);
	await comfy.page.waitForTimeout(2000);

	// official models should be listed
	let result = await checkAllNodesModels(...officialModels);
	expect(result).toMatchObject([true, true, true, false, true]);

	// community models should be listed
	result = await checkAllNodesModels(...communityModels);
	expect(result).toMatchObject([true, true, true, true, true]);

	// an uncurated model should be listed (example used in other tests)
	const result2 = await sampler?.widgetHasOption(
		"model",
		"Photonic-Fusion-SDXL (SDXL)",
	);
	expect(result2).toBeTruthy();

	// local-only models should still be hidden while bridge mode is on
	result = await checkAllNodesModels(...localOnlyModels);
	expect(result).toMatchObject([false, false, false, false, false]);
});

test('"Show community" and "Show uncurated" context menu options are only displayed if bridge mode is enabled', async ({
	comfy,
}) => {
	await comfy.openWorkflow("all_nodes");

	const sampler = await comfy.getNodeRef("DrawThingsSampler");

	// with bridge mode OFF the community/uncurated options should not be present
	let menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions).toBeDefined();
	expect(
		!(
			menuOptions?.includes(menuCommunity.true) ||
			menuOptions?.includes(menuCommunity.false)
		),
	).toBeTruthy();
	expect(
		!(
			menuOptions?.includes(menuUncurated.true) ||
			menuOptions?.includes(menuUncurated.false)
		),
	).toBeTruthy();

	// enable bridge mode
	await comfy.updateSetting("drawthings.bridge_mode.enabled", true);
	await comfy.page.waitForTimeout(2000);

	// now the community and uncurated options should appear (either checked or unchecked)
	menuOptions = await sampler?.getContextMenuOptions();
	expect(menuOptions).toBeDefined();
	expect(
		menuOptions?.includes(menuCommunity.true) ||
			menuOptions?.includes(menuCommunity.false),
	).toBeTruthy();
	expect(
		menuOptions?.includes(menuUncurated.true) ||
			menuOptions?.includes(menuUncurated.false),
	).toBeTruthy();

	// disable bridge mode again
	await comfy.updateSetting("drawthings.bridge_mode.enabled", false);
	await comfy.page.waitForTimeout(2000);

	// community/uncurated should no longer be present
	menuOptions = await sampler?.getContextMenuOptions();
	expect(
		!(
			menuOptions?.includes(menuCommunity.true) ||
			menuOptions?.includes(menuCommunity.false)
		),
	).toBeTruthy();
	expect(
		!(
			menuOptions?.includes(menuUncurated.true) ||
			menuOptions?.includes(menuUncurated.false)
		),
	).toBeTruthy();
});

async function getCheckAllNodesModels(comfy: ComfyPage) {
	const sampler = await comfy.getNodeRef("DrawThingsSampler");
	const lora = await comfy.getNodeRef("DrawThingsLoRA");
	const cnet = await comfy.getNodeRef("DrawThingsControlNet");
	const prompt = await comfy.getNodeRef("DrawThingsPrompt");
	// const upscaler = await comfy.getNodeRef("DrawThingsUpscaler");
	const refiner = await comfy.getNodeRef("DrawThingsRefiner");

	async function hasModel(
		samplerModel,
		loraModel,
		cnetModel,
		promptModel,
		// upscalerModel,
		refinerModel,
	): Promise<(boolean | undefined)[]> {
		return [
			await sampler?.widgetHasOption("model", samplerModel, true),
			await lora?.widgetHasOption("lora", loraModel, true),
			await cnet?.widgetHasOption("control_name", cnetModel, true),
			await prompt?.widgetHasOption(
				"insert_textual_inversion",
				promptModel,
				true,
			),
			// await upscaler?.widgetHasOption("upscaler_model", upscalerModel),
			await refiner?.widgetHasOption("refiner_model", refinerModel, true),
		];
	}

	return hasModel;
}
