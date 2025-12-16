import "dotenv/config";
import { expect } from "@playwright/test";
import { test } from "./fixtures";

// import fse from "fs-extra";
// import { join } from "node:path";

export const workflowFolder = "./tests/workflows";

test.describe("Category", () => {
    test("Test case statement", async ({ comfy }) => {
        expect(true).toBeTruthy();
    });
});
