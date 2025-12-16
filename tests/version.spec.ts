import "dotenv/config";
import { expect } from "@playwright/test";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { test } from "./fixtures";
import fse from "fs-extra";

export const workflowFolder = "./tests/workflows";

test("load workflow from previous version", async ({ comfy }) => {
    // load workflow
    await comfy.goto();
    await comfy.openWorkflow(join(workflowFolder, "old_version.json"));

    // assert toast appears
    const toastLoc = comfy.page.locator(".p-toast-message-text");
    await expect(toastLoc).toContainText("Draw Things gRPC");
    await expect(toastLoc).toContainText(
        "The Draw Things Sampler node contained invalid values - they have been corrected"
    );

    // check properties
    const node = (await comfy.getNodeRef("DrawThingsSampler"))!;
    await node.centerNode();
    await node.selectWidgetOption("sampler_name", "TCD");
    await expect(
        await node.isWidgetVisible("stochastic_sampling_gamma")
    ).toBeTruthy();

    // assert workflow json file used the old prompt nodes
    const workflowJson = await readFile(
        join(workflowFolder, "old_version.json"),
        "utf-8"
    );
    expect(workflowJson).toContain("DrawThingsPositive");
    expect(workflowJson).toContain("DrawThingsNegative");
    expect(workflowJson).not.toContain("DrawThingsPrompt");

    // assert the old nodes were replaced when loaded
    const negativeNode = await comfy.getNodeRef("DrawThingsNegative", {
        doNotThrow: true,
    });
    expect(negativeNode).toBeUndefined();

    const positiveNode = await comfy.getNodeRef("DrawThingsPositive", {
        doNotThrow: true,
    });
    expect(positiveNode).toBeUndefined();

    const promptNode = await comfy.getNodeRef("DrawThingsPrompt");
    expect(promptNode).not.toBeUndefined();
});

test("sampler widgets serialization", async ({ comfy }) => {
    // start with empty workflow
    await comfy.createNewWorkflow();

    // add sampler node
    const node = await comfy.addNode(
        ["DrawThings", "Draw Things Sampler"],
        0,
        0
    );
    await node.centerNode();

    // change various widget values
    await node.selectWidgetOption("sampler_name", "TCD");
    await node.setWidgetValue("stochastic_sampling_gamma", 0.5);
    await node.setWidgetValue("width", 1024);
    await node.setWidgetValue("height", 768);

    const workflow = await comfy.exportWorkflow();
    console.warn(workflow);
    expect(workflow).toMatchObject({});

    // export workflow

    // assert workflow file has widget values by key

    // scramble the values in the array in the workflow file

    // load the workflow

    // assert values were loaded by key
});

test("updates notes", async ({ comfy, page }) => {
    // clear user data
    await comfy.clearUserData();

    const toastLoc = comfy.page.locator(".p-toast-message-text");

    // load workflow that doesn't use DT
    await comfy.createNewWorkflow();
    await page.waitForTimeout(5000);
    await expect(toastLoc).not.toBeVisible({ timeout: 5000 });

    // assert update notes do not appear

    // load workflow with DT sampler
    await comfy.openWorkflow(join(workflowFolder, "node.json"));

    // assert update notes appears
    await expect(toastLoc).toBeVisible();
    await expect(toastLoc).toContainText("DrawThings-gRPC");

    // reload
    await page.reload();
    await page.waitForTimeout(5000);

    // assert notes does not appear
    await expect(toastLoc).not.toBeVisible({ timeout: 5000 });
});
