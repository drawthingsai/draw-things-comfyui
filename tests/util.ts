import "dotenv/config";
import { Page, expect } from "@playwright/test";
import sharp from "sharp";

const comfyUrl = process.env.PLAYWRIGHT_TEST_URL || "";
if (!comfyUrl) throw new Error("PLAYWRIGHT_TEST_URL is not set");

export async function openWorkflow(workflow: string, page: Page) {
	await page.goto(comfyUrl);

	// Expect a title "to contain" a substring.
	await expect(page).toHaveTitle(/ComfyUI/);

	const fileChooserPromise = page.waitForEvent("filechooser");

	await page
		.locator("a")
		.filter({ hasText: /^Workflow$/ })
		.click();
	await page.getByText("OpenCtrl + o").click();

	const fileChooser = await fileChooserPromise;
	await fileChooser.setFiles(workflow);

	await page.locator("#graph-canvas").click({
		position: {
			x: 137,
			y: 246,
		},
	});

	await page.waitForTimeout(1000);
	await page.locator("#graph-canvas").press(".");
	await page.waitForTimeout(1000);
}

export async function createNewWorkflow(page: Page) {
	await page.goto(comfyUrl);

	// Expect a title "to contain" a substring.
	await expect(page).toHaveTitle(/ComfyUI/);

	await page
		.locator("a")
		.filter({ hasText: /^Workflow$/ })
		.click();
	await page.getByRole("menuitem", { name: "New" }).locator("a").click();

	await page.evaluate(() => {
		if (!window.app?.canvas.ds) return;
		window.app.canvas.ds.offset = [50, 50];
		window.app.canvas.ds.scale = 0.8;
		window.app.canvas.setDirty(true, true);
	});
}

export async function centerOnPoint(
	page: Page,
	x: number,
	y: number,
	scale = 1,
) {
	await page.evaluate(
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

/**
 * Convert an image to a 16x16 Lab vector and return as base64.
 */
export async function imageToVectorBase64(
	filepath: string,
	size = 16,
): Promise<string> {
	// Resize + get raw RGB data
	const { data, info } = await sharp(filepath)
		.resize(size, size, { fit: "fill" })
		.raw()
		.toBuffer({ resolveWithObject: true });

	const vec = new Float32Array(size * size * 3);

	// Convert RGB → Lab for each pixel
	for (let i = 0; i < size * size; i++) {
		const r = data[i * 3 + 0] / 255;
		const g = data[i * 3 + 1] / 255;
		const b = data[i * 3 + 2] / 255;

		// --- RGB -> XYZ ---
		const srgbToLinear = (v: number) =>
			v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

		const R = srgbToLinear(r);
		const G = srgbToLinear(g);
		const B = srgbToLinear(b);

		const x = R * 0.4124 + G * 0.3576 + B * 0.1805;
		const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
		const z = R * 0.0193 + G * 0.1192 + B * 0.9505;

		// D65 reference white
		const Xn = 0.95047;
		const Yn = 1.0;
		const Zn = 1.08883;

		const f = (t: number) =>
			t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116;

		const fx = f(x / Xn);
		const fy = f(y / Yn);
		const fz = f(z / Zn);

		const L = 116 * fy - 16;
		const a = 500 * (fx - fy);
		const bVal = 200 * (fy - fz);

		vec[i * 3 + 0] = L;
		vec[i * 3 + 1] = a;
		vec[i * 3 + 2] = bVal;
	}

	// Convert float array → base64
	return Buffer.from(vec.buffer).toString("base64");
}

/**
 * Compare two base64 Lab vectors.
 * Returns similarity from 0 to 1 (1 = identical).
 */
export function compareVectors(v1: string, v2: string): number {
	const buf1 = Buffer.from(v1, "base64");
	const buf2 = Buffer.from(v2, "base64");

	const a = new Float32Array(buf1.buffer, buf1.byteOffset, buf1.byteLength / 4);
	const b = new Float32Array(buf2.buffer, buf2.byteOffset, buf2.byteLength / 4);

	if (a.length !== b.length) {
		throw new Error("Vector lengths do not match.");
	}

	let sumSq = 0;
	for (let i = 0; i < a.length; i++) {
		const d = a[i] - b[i];
		sumSq += d * d;
	}

	const dist = Math.sqrt(sumSq);

	// Maximum expected distance for Lab tiny vectors (empirical but safe)
	// Normalizes similarity to [0,1]
	const maxDist = 4000; // tweakable depending on sensitivity
	const sim = Math.max(0, 1 - dist / maxDist);

	return sim;
}