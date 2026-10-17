import { expect } from "@playwright/test";
import { join } from "path";
import { test } from "./fixtures";

const comfyUrl = process.env.PLAYWRIGHT_TEST_URL || "";
if (!comfyUrl) throw new Error("PLAYWRIGHT_TEST_URL is not set");

export const workflowFolder = "./tests/workflows";

test("not connected error message when executing", async ({ page, comfy }) => {
    await comfy.openWorkflow(join(workflowFolder, "sd1_a.json"));
    const sampler = (await comfy.getNodeRef("DrawThingsSampler"));

    if (!sampler) throw new Error("Couldn't find sampler node")

    // toggle tls to disconnect
    await sampler.selectWidgetOption("settings", "Basic");
    await sampler.clickWidget("use_tls");
    await page.waitForTimeout(1000);
    await expect(await sampler.getWidgetValue("model")).toBe("Not connected");
});
