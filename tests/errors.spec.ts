import { join } from "path";
import { test } from "./fixtures";
import { NodeRef } from "./nodeRef";
import { expect } from "@playwright/test";

const comfyUrl = process.env.PLAYWRIGHT_TEST_URL || "";
if (!comfyUrl) throw new Error("PLAYWRIGHT_TEST_URL is not set");

export const workflowFolder = "./tests/workflows";

test("not connected error message when executing", async ({ page, comfy }) => {
    await comfy.openWorkflow(join(workflowFolder, "sd1_a.json"));
    const sampler = (await comfy.getNodeRef("DrawThingsSampler"))!;

    // toggle tls to disconnect
    await sampler.selectWidgetOption("settings", "Basic");
    await sampler?.clickWidget("use_tls");
    await page.waitForTimeout(1000);
    await expect(await sampler?.getWidgetValue("model")).toBe("Not connected");

    // try running workflow
    await page
        .getByTestId("queue-button")
        .getByRole("button", { name: "Run" })
        .click();

    await expect(page.locator(".p-dialog-content")).toContainText(
        "Couldn't connect to Draw Things gRPC server. Check your server and settings, and try again."
    );
});
