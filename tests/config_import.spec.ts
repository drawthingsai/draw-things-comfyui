import "dotenv/config";
import { expect } from "@playwright/test";
import { join } from "node:path";
import { test } from "./fixtures";
import configs from "./data/configs";

export const workflowFolder = "./tests/workflows";

test.beforeAll(async ({ comfy }) => {
	await comfy.goto();
	await comfy.updateSetting("drawthings.bridge_mode.enabled", false);
	await comfy.page.waitForTimeout(2000);
});

test.describe("Sampler node", () => {
	test("Pasting DT config sets all properties to correct values (1)", async ({
		comfy,
	}) => {
		await comfy.setClipboard(configs.samplerFlux);
		await comfy.openWorkflow(join(workflowFolder, "node.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		await comfy.page.waitForTimeout(1000);

		const actual = await sampler?.getAllWidgetValues();

		const expected = {
			settings: "All",
			server: "localhost",
			port: "7859",
			use_tls: true,
			model: {
				value: {
					file: "flux_1_dev_q5p.ckpt",
				},
				content: "FLUX.1 [dev] (8-bit) (F1)",
			},
			strength: 0.9,
			seed: 22222,
			seed_mode: "ScaleAlike",
			width: 768,
			height: 1152,
			steps: 16,
			cfg: 3,
			cfg_zero_star: true,
			cfg_zero_star_init_steps: 3,
			speed_up: true,
			guidance_embed: 4.5,
			sampler_name: "Euler A Trailing",
			res_dpt_shift: true,
			shift: 2.8339362,
			batch_size: 1,
			clip_skip: 2,
			sharpness: 0,
			mask_blur: 2.5,
			mask_blur_outset: 0,
			preserve_original: true,
			high_res_fix: false,
			tiled_decoding: false,
			tiled_diffusion: false,
			tea_cache: true,
			tea_cache_start: 5,
			tea_cache_end: -3,
			tea_cache_threshold: 0.04,
			tea_cache_max_skip_steps: 2,
			separate_clip_l: true,
			clip_l_text: "special",
			separate_open_clip_g: false,
		};

		expect(actual).toMatchObject(expected);
	});

	test("Pasting DT config sets all properties to correct values (2)", async ({
		comfy,
	}) => {
		await comfy.setClipboard(configs.samplerXL);
		await comfy.openWorkflow(join(workflowFolder, "node.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		await comfy.page.waitForTimeout(1000);

		const actual = await sampler?.getAllWidgetValues();

		const expected = {
			model: {
				value: {
					file: "xi_v2_f16.ckpt",
				},
				content: "xi_v2 (SDXL)",
			},
			strength: 0.8,
			seed: 33333,
			seed_mode: "NvidiaGpuCompatible",
			width: 768,
			height: 768,
			steps: 22,
			cfg: 5,
			sampler_name: "TCD",
			stochastic_sampling_gamma: 0.24,
			shift: 1.3,
			batch_size: 1,
			clip_skip: 2,
			sharpness: 3.5,
			mask_blur: 3,
			mask_blur_outset: 10,
			preserve_original: true,
			high_res_fix: true,
			high_res_fix_start_width: 640,
			high_res_fix_start_height: 640,
			high_res_fix_strength: 0.6,
			tiled_decoding: true,
			decoding_tile_width: 384,
			decoding_tile_height: 384,
			decoding_tile_overlap: 128,
			tiled_diffusion: true,
			diffusion_tile_width: 512,
			diffusion_tile_height: 512,
			diffusion_tile_overlap: 64,
		};

		expect(actual).toMatchObject(expected);
	});

	test("Error message is displayed when clipboard does not contain a DT config", async ({
		comfy,
	}) => {
		await comfy.setClipboard("hello");
		await comfy.openWorkflow(join(workflowFolder, "node.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		let message = "";
		comfy.page.on("dialog", (dialog) => {
			message = dialog.message();
			dialog.dismiss();
		});

		await sampler?.selectContextMenuOption("Paste Draw Things config");
		await comfy.page.waitForTimeout(1000);

		expect(message).toContain("Failed to parse Draw Things config from clipboard");
	});

	test("Invalid or incorrect values in the config are coerced to valid values", async ({
		comfy,
	}) => {
		const config = structuredClone(configs.samplerFlux);
		config.width = 650; // should be coerced to 640
		config.height = "900"; // should be coereced to 896
		config.steps = 5000; // should be coerced to 150
		config.guidanceScale = -2; // should be... 0?
		config.resolutionDependentShift = false;
		config.shift = "apple"; // should be 1

		await comfy.setClipboard(config);
		await comfy.openWorkflow(join(workflowFolder, "node.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		await comfy.page.waitForTimeout(1000);
		await expect(
			comfy.page.getByText(
				"The Draw Things Sampler node contained invalid values - they have been corrected:",
			),
		).toBeVisible();

		const actual = await sampler?.getAllWidgetValues();

		const expected = {
			settings: "All",
			server: "localhost",
			port: "7859",
			use_tls: true,
			model: {
				value: {
					file: "flux_1_dev_q5p.ckpt",
				},
				content: "FLUX.1 [dev] (8-bit) (F1)",
			},
			strength: 0.9,
			seed: 22222,
			seed_mode: "ScaleAlike",
			width: 640,
			height: 896,
			steps: 150,
			cfg: 0,
			cfg_zero_star: true,
			cfg_zero_star_init_steps: 3,
			speed_up: true,
			guidance_embed: 4.5,
			sampler_name: "Euler A Trailing",
			res_dpt_shift: false,
			shift: 1,
			batch_size: 1,
			clip_skip: 2,
			sharpness: 0,
			mask_blur: 2.5,
			mask_blur_outset: 0,
			preserve_original: true,
			high_res_fix: false,
			tiled_decoding: false,
			tiled_diffusion: false,
			tea_cache: true,
			tea_cache_start: 5,
			tea_cache_end: -3,
			tea_cache_threshold: 0.04,
			tea_cache_max_skip_steps: 2,
			separate_clip_l: true,
			clip_l_text: "special",
			separate_open_clip_g: false,
		};

		expect(actual).toMatchObject(expected);
	});

	test("Size or weight values for disabled features are not imported", async ({
		comfy,
	}) => {
		expect(false);
	});
});

// --- Upscaler and Refiner ---
test.describe("Upscaler and Refiner", () => {
	test("if nodes are connected, values are applied", async ({ comfy }) => {
		await comfy.setClipboard({
			...configs.samplerFlux,
			...configs.upscaler,
			...configs.refiner,
		});
		await comfy.openWorkflow(join(workflowFolder, "all_nodes.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		await comfy.page.waitForTimeout(1000);

		const upscaler = await comfy.getNodeRef("DrawThingsUpscaler");
		const upscalerActual = await upscaler?.getAllWidgetValues();
		const refiner = await comfy.getNodeRef("DrawThingsRefiner");
		const refinerActual = await refiner?.getAllWidgetValues();

		expect({ ...upscalerActual, ...refinerActual }).toMatchObject({
			upscaler_model: { value: { file: "realesrgan_x4plus_f16.ckpt" } },
			upscaler_scale_factor: 2,
			refiner_model: { value: { file: "xi_v2_f16.ckpt" } },
			refiner_start: 0.9,
		});
	});

	test("if nodes are connected, invalid values are coerced", async ({
		comfy,
	}) => {
		await comfy.setClipboard({
			...configs.samplerFlux,
			...configs.upscaler,
			...configs.refiner,
			upscalerScaleFactor: 7,
			refinerStart: "cheese",
		});
		await comfy.openWorkflow(join(workflowFolder, "all_nodes.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		await comfy.page.waitForTimeout(1000);

		const upscaler = await comfy.getNodeRef("DrawThingsUpscaler");
		const upscalerActual = await upscaler?.getAllWidgetValues();
		const refiner = await comfy.getNodeRef("DrawThingsRefiner");
		const refinerActual = await refiner?.getAllWidgetValues();

		expect({ ...upscalerActual, ...refinerActual }).toMatchObject({
			upscaler_model: {
				value: { file: "realesrgan_x4plus_f16.ckpt" },
			},
			upscaler_scale_factor: 4,
			refiner_model: { value: { file: "xi_v2_f16.ckpt" } },
			refiner_start: 0.85,
		});
	});

	test("if nodes are not connected, a message is displayed listing the missing nodes", async ({
		comfy,
	}) => {
		await comfy.setClipboard({
			...configs.samplerFlux,
			...configs.upscaler,
			...configs.refiner,
		});
		await comfy.openWorkflow(join(workflowFolder, "all_nodes.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		const toast = comfy.page.getByText(
			"The Draw Things config has been partially loaded.",
		);

		await expect(toast).not.toBeVisible();

		await sampler?.disconnectInput("upscaler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		await expect(toast).toContainText("DrawThingsUpscaler");
		await expect(toast).not.toContainText("DrawThingsRefiner");
		await comfy.page.getByRole("button", { name: "Close" }).click();

		await sampler?.disconnectInput("refiner");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		await expect(toast.last()).toContainText("DrawThingsUpscaler");
		await expect(toast.last()).toContainText("DrawThingsRefiner");
	});
});

// --- Lora ---
test.describe("Lora", () => {
	test("if enough nodes are connected, values are applied", async ({ comfy }) => {
		await comfy.setClipboard({
			...configs.samplerFlux,
			...configs.lora2,
		});
		await comfy.openWorkflow(join(workflowFolder, "all_nodes.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		const loraNode = await comfy.getNodeRef("DrawThingsLoRA");
		const actual = await loraNode?.getAllWidgetValues();

		const expected = {
			lora: { value: { file: "hyper_sdxl_8_step_lora_f16.ckpt" } },
			weight: 0.1,
			mode: "All",
			lora_2: { value: { file: "dmd2_sdxl_4_step_lora_f16.ckpt" } },
			weight_2: 0.2,
			mode_2: "Refiner",
			lora_3: "(None selected)",
			weight_3: 1.0,
			mode_3: "All",
			lora_4: "(None selected)",
			weight_4: 1.0,
			mode_4: "All",
			lora_5: "(None selected)",
			weight_5: 1.0,
			mode_5: "All",
			lora_6: "(None selected)",
			weight_6: 1.0,
			mode_6: "All",
			lora_7: "(None selected)",
			weight_7: 1.0,
			mode_7: "All",
			lora_8: "(None selected)",
			weight_8: 1.0,
			mode_8: "All",
		};

		expect(actual).toMatchObject(expected);
	});

	test("if nodes are connected, invalid values are coerced", async ({
		comfy,
	}) => {
		const config = {
			...configs.samplerFlux,
			...configs.lora2,
		};
		config.loras[0].weight = "not a number";
		config.loras[0].mode = "every";
		config.loras[1].weight = 70;
		config.loras[1].mode = 1;

		await comfy.setClipboard(config);

		await comfy.openWorkflow(join(workflowFolder, "all_nodes.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		const loraNode = await comfy.getNodeRef("DrawThingsLoRA");
		const actual = await loraNode?.getAllWidgetValues();

		const expected = {
			lora: {
				value: { file: "hyper_sdxl_8_step_lora_f16.ckpt" },
			},
			weight: 1.0,
			mode: "All",
			lora_2: {
				value: { file: "dmd2_sdxl_4_step_lora_f16.ckpt" },
			},
			weight_2: 5.0,
			mode_2: "All",
		};

		expect(actual).toMatchObject(expected);
	});

	test("if not enough lora nodes are connected, a message is displayed listing the missing nodes", async ({
		comfy,
	}) => {
		// prepare a config with 12 loras
		await comfy.setClipboard({
			...configs.samplerFlux,
			...configs.lora12,
		});
		await comfy.openWorkflow(join(workflowFolder, "lora_chain.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");

		// the lora node ids are 25 and 26
		const secondLora = await comfy.getNodeRef(26);

		const toast = comfy.page.getByText(
			"The Draw Things config has been partially loaded.",
		);

		// load the config with both lora nodes connected, assert no message
		await sampler?.selectContextMenuOption("Paste Draw Things config");
		await expect(toast).not.toBeVisible();

		// disconnect first lora node, leaving only 8 available slots
		await secondLora?.disconnectInput("lora_stack");

		// load config, confirm message says 1 more is needed
		await sampler?.selectContextMenuOption("Paste Draw Things config");
		await expect(toast).toContainText("1 x DrawThingsLoRA");

		// disconnect the second lora node, no available slots
		await sampler?.disconnectInput("lora");

		// load config, confirm message says 2 more are needed
		await sampler?.selectContextMenuOption("Paste Draw Things config");
		await expect(toast.last()).toContainText("2 x DrawThingsLoRA");
	});

	test("if the config has >8 loras and enough nodes are connected, both nodes have config applied", async ({
		comfy,
	}) => {
		// prepare a config with 12 loras
		await comfy.setClipboard({
			...configs.samplerFlux,
			...configs.lora12,
		});
		await comfy.openWorkflow(join(workflowFolder, "lora_chain.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");

		// the lora node ids are 25 and 26
		const firstLora = await comfy.getNodeRef(25);
		const secondLora = await comfy.getNodeRef(26);

		await sampler?.selectContextMenuOption("Paste Draw Things config");

		const firstLoraValues = await firstLora?.getAllWidgetValues();
		const secondLoraValues = await secondLora?.getAllWidgetValues();

		const modelA = { value: { file: "hyper_sdxl_8_step_lora_f16.ckpt" } };
		const modelB = { value: { file: "dmd2_sdxl_4_step_lora_f16.ckpt" } };

		expect(secondLoraValues).toMatchObject({
			lora: modelA,
			weight: 0.1,
			mode: "All",
			lora_2: modelB,
			weight_2: 0.2,
			mode_2: "Refiner",
			lora_3: modelA,
			weight_3: 0.3,
			mode_3: "All",
			lora_4: modelB,
			weight_4: 0.4,
			mode_4: "Refiner",
			lora_5: modelA,
			weight_5: 0.5,
			mode_5: "All",
			lora_6: modelB,
			weight_6: 0.6,
			mode_6: "Refiner",
			lora_7: modelA,
			weight_7: 0.7,
			mode_7: "All",
			lora_8: modelB,
			weight_8: 0.8,
			mode_8: "Refiner",
		});

		expect(firstLoraValues).toMatchObject({
			lora: modelA,
			weight: 0.9,
			mode: "All",
			lora_2: modelB,
			weight_2: 1.0,
			mode_2: "Refiner",
			lora_3: modelA,
			weight_3: 1.1,
			mode_3: "All",
			lora_4: modelB,
			weight_4: 1.2,
			mode_4: "Refiner",
			lora_5: "(None selected)",
			weight_5: 1.0,
			mode_5: "All",
			lora_6: "(None selected)",
			weight_6: 1.0,
			mode_6: "All",
			lora_7: "(None selected)",
			weight_7: 1.0,
			mode_7: "All",
			lora_8: "(None selected)",
			weight_8: 1.0,
			mode_8: "All",
		});
	});

	test("if the config has >8 loras and only one node is connected, the first 8 are applied and a message is displayed listing the missing node", async ({
		comfy,
	}) => {
		// prepare a config with 12 loras
		await comfy.setClipboard({
			...configs.samplerFlux,
			...configs.lora12,
		});
		await comfy.openWorkflow(join(workflowFolder, "lora_chain.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");

		// the lora node ids are 25 and 26
		const secondLora = await comfy.getNodeRef(26);
		await secondLora?.disconnectInput("lora_stack");

		await sampler?.selectContextMenuOption("Paste Draw Things config");

		const secondLoraValues = await secondLora?.getAllWidgetValues();

		const modelA = { value: { file: "hyper_sdxl_8_step_lora_f16.ckpt" } };
		const modelB = { value: { file: "dmd2_sdxl_4_step_lora_f16.ckpt" } };

		expect(secondLoraValues).toMatchObject({
			lora: modelA,
			weight: 0.1,
			mode: "All",
			lora_2: modelB,
			weight_2: 0.2,
			mode_2: "Refiner",
			lora_3: modelA,
			weight_3: 0.3,
			mode_3: "All",
			lora_4: modelB,
			weight_4: 0.4,
			mode_4: "Refiner",
			lora_5: modelA,
			weight_5: 0.5,
			mode_5: "All",
			lora_6: modelB,
			weight_6: 0.6,
			mode_6: "Refiner",
			lora_7: modelA,
			weight_7: 0.7,
			mode_7: "All",
			lora_8: modelB,
			weight_8: 0.8,
			mode_8: "Refiner",
		});

		const toast = comfy.page.getByText(
			"The Draw Things config has been partially loaded.",
		);

		await expect(toast).toContainText("1 x DrawThingsLoRA");
	});
});

// --- Controlnet ---
test.describe("Controlnet", () => {
	test("if enough nodes are connected, values are applied", async ({ comfy }) => {
		await comfy.setClipboard({
			...configs.samplerFlux,
			...configs.cnet,
		});
		await comfy.openWorkflow(join(workflowFolder, "all_nodes.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		const cnetNode = await comfy.getNodeRef("DrawThingsControlNet");
		const actual = await cnetNode?.getAllWidgetValues();

		expect(actual).toMatchObject({
			control_name: {
				value: { file: "controlnet_depth_sdxl_v1.0_mid_f16.ckpt" },
			},
			control_mode: "Prompt",
			control_weight: 0.75,
			control_start: 0.1,
			control_end: 0.2,
		});
	});

	test("if nodes are connected, invalid values are coerced", async ({
		comfy,
	}) => {
		const config = {
			...configs.samplerFlux,
			...configs.cnet,
		};
		config.controls[0].controlImportance = 7;
		config.controls[0].guidanceEnd = 8;
		config.controls[0].guidanceStart = -5;
		config.controls[0].weight = "heavy";

		await comfy.setClipboard(config);
		await comfy.openWorkflow(join(workflowFolder, "all_nodes.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		const cnetNode = await comfy.getNodeRef("DrawThingsControlNet");
		const actual = await cnetNode?.getAllWidgetValues();

		expect(actual).toMatchObject({
			control_name: {
				value: {
					file: "controlnet_depth_sdxl_v1.0_mid_f16.ckpt",
				},
			},
			control_mode: "Balanced",
			control_weight: 1.0,
			control_start: 0.0,
			control_end: 1.0,
		});
	});

	test("if no cnet node is connected, a message is displayed listing the missing node", async ({
		comfy,
	}) => {
		// prepare a config with 2 cnets
		await comfy.setClipboard({
			...configs.samplerFlux,
			...configs.cnet2,
		});
		await comfy.openWorkflow(join(workflowFolder, "cnet_chain.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");

		// the cnet node ids are 29 and 28
		const secondCnet = await comfy.getNodeRef(28);

		const toast = comfy.page.getByText(
			"The Draw Things config has been partially loaded.",
		);

		// load the config with both cnet nodes connected, assert no message
		await sampler?.selectContextMenuOption("Paste Draw Things config");
		await expect(toast).not.toBeVisible();

		// disconnect first cnet node, leaving only 1
		await secondCnet?.disconnectInput("control_net");

		// load config, confirm message says 1 more is needed
		await sampler?.selectContextMenuOption("Paste Draw Things config");
		await expect(toast).toContainText("1 x DrawThingsControlNet");

		// disconnect the second cnet node, no available slots
		await sampler?.disconnectInput("control_net");

		// load config, confirm message says 2 more are needed
		await sampler?.selectContextMenuOption("Paste Draw Things config");
		await expect(toast.last()).toContainText("2 x DrawThingsControlNet");
	});

	test("if the config has more controls than there are nodes connected, the first n are applied and a message is displayed listing the missing nodes", async ({
		comfy,
	}) => {
		const config = {
			...configs.samplerFlux,
			...configs.cnet2,
		};
		config.controls.push(config.controls[0]);
		await comfy.setClipboard(config);

		await comfy.openWorkflow(join(workflowFolder, "cnet_chain.json"));

		const sampler = await comfy.getNodeRef("DrawThingsSampler");
		await sampler?.selectContextMenuOption("Paste Draw Things config");

		// the cnet node ids are 29 and 28
		const firstCnet = await comfy.getNodeRef(29);
		const secondCnet = await comfy.getNodeRef(28);

		const toast = comfy.page.getByText(
			"The Draw Things config has been partially loaded.",
		);
		await expect(toast).toContainText("1 x DrawThingsControlNet");

		const firstActual = await firstCnet?.getAllWidgetValues();
		expect(firstActual).toMatchObject({
			control_name: {
				value: {
					file: "controlnet_xinsir_union_promax_sdxl_1.0_f16.ckpt",
				},
			},
			control_mode: "Control",
			control_weight: 0.85,
			control_start: 0.3,
			control_end: 0.4,
			control_input_type: "Depth",
		});

		const secondActual = await secondCnet?.getAllWidgetValues();
		expect(secondActual).toMatchObject({
			control_name: {
				value: { file: "controlnet_depth_sdxl_v1.0_mid_f16.ckpt" },
			},
			control_mode: "Prompt",
			control_weight: 0.75,
			control_start: 0.1,
			control_end: 0.2,
		});
	});
});
