import "dotenv/config";
import { expect, Page } from "@playwright/test";
import sharp from "sharp";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { ComfyPage } from "./fixtures";
import { test } from "./fixtures";
import fse from "fs-extra";
import { compareVectors, imageToVectorBase64 } from "./util";
import { vecs } from "./vector";

const comfyUrl = process.env.PLAYWRIGHT_TEST_URL || "";
if (!comfyUrl) throw new Error("PLAYWRIGHT_TEST_URL is not set");

const workflowFolder = "./tests/workflows";
const comfyFolder = process.env.TEST_COMFYUI_DIR || "";
if (!comfyFolder) throw new Error("TEST_COMFYUI_DIR is not set");

const outputFolder = join(comfyFolder, "output");
const inputFolder = join(comfyFolder, "input");

const bridgemode = true;

test.beforeEach(async () => {
	test.setTimeout(300000);
});

// note: it's entirely possibly that these tests will not work when run on a different system
// I tried to cover most features/settings with these, so if anything breaks, the generated output should be different
// (they could also break for a variety of other reasons)
// requires DT running at localhost:7859 with the following models
// Stable Diffusion 1.5
// Juggernaut Rebord (8-bit)
// Foooocus Inpaint SDXL v2.6
// FoxAI Pony Fantastic (for refiner test) (https://civitai.com/models/856827)
// Xi v2 (for refiner test) (https://civitai.com/models/259563)
// Flux dev (8bit)

// st_monsters embedding (https://civitai.com/models/332132)

// inpainting cnet sd1.5
// depth map sd1
// shuffle sd1

// DMD2 (for refiner lora test)
// Hyper SDXL 8-step (for refiner lora test)
// Weight slider (for refiner lora test)
// FLUX.1 Turbo Alpha

test("test output: sd1_a", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "sd1_a");
});

test("test output: sd1_b", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "sd1_b");
});

test("test output: unipc", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "unipc");
});

test("test output: sdxl_a", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "sdxl_a");
});

test("test output: sdxl_b", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "sdxl_b");
});

test("test output: flux_a", async ({ page, comfy }) => {
	test.setTimeout(300000);
	await compareOutput(page, comfy, "flux_a");
});

// doesn't work in bridge mode
// test("test output: img2img_crop_ti", async ({ page, comfy }) => {
// 	await compareOutput(
// 		page,
// 		comfy,
// 		"img2img_crop_ti",
// 		"aIi4Oeig3zlYxi452AyOOdgmjjy4Np48q7LenJw5p5xQO5OcIhbHnA8T84yPifnMncD+zB7G+MwuzL5cZ1yzTNP42c3seJTHbtzO5x9xz+O1MefTY4P753GH/0V8jj8OfA4fH/Eujj/5w4Q/PwDgHzsC+R97ossPObHvD/FUPgc=",
// 		"jW49a3trXCN4KzMtoyfjL+iby5+dnzQXPjMeeAc9mT8=",
// 	);
// });

test("test output: inpaint_cnet", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "inpaint_cnet");
});

test("test output: inpaint_sdxl", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "inpaint_sdxl");
});

// test("test output: refiner_lora_a", async ({ page, comfy }) => {
// 	await compareOutput(
// 		page,
// 		comfy,
// 		"refiner_lora_a",
// 		"AMDs/wDA6P8AkPP/AJD3/wBA0/8AiNf/AID3/wCYy/8ARDP/AOPj/oD4w/1AdPP7QHDi+wBw8v0AcHj9AHI8/SBmv/cgDz/7IIM++yBTPv+QEzf+kJM39pCTN/eQ0zb3kFM39pB5X/aQ8Sf2kKcz9pAuC/aAdxn2kAcH84A3KfM=",
// 		"QPsg+wD3EPPA7kTdgN0y9zK2ErYSpjKmMqKysvTwlMw=",
// 	);
// });

// test("test output: refiner_lora_b", async ({ page, comfy }) => {
// 	await compareOutput(
// 		page,
// 		comfy,
// 		"refiner_lora_b",
// 		"AMju/wBg+P8AkPP/AIDz/wBo+/8AAOP/AJD3/wCYyf8AZDn/AOPj/oD4wf1A9LH7ANDm/wDA/P8A4Xz/AOI8/SBmvPUgB5/3IIMe/yDDPveAwzb+kKMW7pCjMvaQozvukGN77pDjWe6Q8X3+kMEd9pANC/aQ9hD+kJcV+4CXKPs=",
// 		"QPIA+yD+MPJA7kTckN0y8zK2ELYSphKmeqJysvTwxMw=",
// 	);
// });

test("test output: depth cnet with image input", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "depth_cnet");
});

test("test output: shuffle cnet with hints input", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "shuffle_cnet");
});

test("test output: pose with hiresfix", async ({ page, comfy }) => {
	await compareOutput(page, comfy, "pose_hires");
});

async function compareOutput(page: Page, comfy: ComfyPage, workflow: string) {
	const wf = await fse.readJSON(join(workflowFolder, `${workflow}.json`));
	const loadImageNodes = wf.nodes.filter((n) => n.type === "LoadImage");
	const images = loadImageNodes.map((n) => n.widgets_values[0]);

	for (const image of images) {
		const src = join(workflowFolder, image);
		const dst = join(inputFolder, image);
		await fse.copy(src, dst, { overwrite: true });
	}

	await comfy.openWorkflow(join(workflowFolder, `${workflow}.json`));

	await page.waitForTimeout(1000);

	await page.locator("#graph-canvas").click({
		position: {
			x: 137,
			y: 246,
		},
	});

	await page.locator("#graph-canvas").press(".");

	await page.waitForTimeout(1000);
	await page
		.getByTestId("queue-button")
		.getByRole("button", { name: "Run" })
		.click();

	await page.waitForTimeout(1000);
	await page.getByRole("button", { name: "Expand job queue" }).click();
	await page.getByText("1 active jobs").waitFor({ state: "visible" });
	await page.getByText("1 active jobs").waitFor({ state: "hidden" });

	await page.getByText("ComfyUI_").first().hover();
	await page.getByRole("button", { name: "View", exact: true }).click();

	const filename = await page
		.locator(".p-galleria-item")
		.locator("img")
		.getAttribute("alt");
	const filepath = join(outputFolder, filename);

	const vec = await imageToVectorBase64(filepath, 12);
	const refVec = vecs[workflow];
	const dif = compareVectors(refVec, vec);
	console.log(`dif for ${workflow}: ${dif}`);
	expect(dif).toBeGreaterThan(0.97);

	// if (
	//     !(await sharp(filepath)
	//         .removeAlpha()
	//         .raw()
	//         .toBuffer({ resolveWithObject: true }))
	// ) {
	//     throw new Error("No output image");
	// }

	// await sharp(workflowFolder + workflow + ".png")
	//     .composite([{ input: filepath, blend: "difference" }])
	//     .toFile(workflowFolder + workflow + "_diff.png");

	// const outImg = await sharp(filepath)
	//     .removeAlpha()
	//     .raw()
	//     .toBuffer({ resolveWithObject: true });
	// const refImg = await sharp(join(workflowFolder, workflow + ".png"))
	//     .removeAlpha()
	//     .raw()
	//     .toBuffer({ resolveWithObject: true });

	// let totalDif = 0;
	// let maxDif = 0;

	// let pixels = 0;

	// for (let i = 0; i < outImg.data.length; i++) {
	//     pixels++;
	//     const dif = Math.abs(outImg.data[i] - refImg.data[i]);
	//     totalDif += dif;
	//     if (dif > maxDif) maxDif = dif;
	// }

	// console.log(totalDif / pixels, maxDif);

	// expect(totalDif / pixels).toBeLessThanOrEqual(6);
}

async function sha256sum(filepath: string): Promise<string> {
	const hash = createHash("sha256");
	const stream = createReadStream(filepath);
	await new Promise((resolve, reject) => {
		stream.on("error", reject);
		stream.on("end", resolve);
		stream.pipe(hash);
	});
	return hash.digest("hex");
}

async function getDhash(imagePath: string, hashSize = 16): Promise<string> {
	const image = await sharp(imagePath)
		.resize(hashSize + 1, hashSize)
		.grayscale()
		// .toFile('temp.png')
		.raw()
		.toBuffer({ resolveWithObject: true });

	// const image = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true })

	let hash = "";
	const hb = new Uint8Array((hashSize * hashSize) / 8);
	let p = 0;

	for (let y = 0; y < hashSize; y++) {
		for (let x = 0; x < hashSize; x++) {
			const index = (y * (hashSize + 1) + x) * image.info.channels;
			const left = image.data[index];
			const right = image.data[index + image.info.channels];
			const bit = left > right ? 1 : 0;
			hash += bit.toString();

			hb[Math.floor(p / 8)] += bit << (p % 8);
			p++;
		}
	}

	return Buffer.from(hb).toString("base64");
}

function compareDHash(a: string, b: string) {
	let dif = 0;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) dif++;
	}
	return dif;
}
