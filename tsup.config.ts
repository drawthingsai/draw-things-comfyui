import { defineConfig } from "tsup";

export default defineConfig({
    
    entry: ["web/src/extension.ts"],
    splitting: false,
    sourcemap: true,
    minify: true,
    clean: true,
    outDir: "web/dist",
    format: "esm",
    platform: "browser",
    outExtension({ format }) {
        return {
            js: `.${format}.js`,
        };
    },
    external: [
        "../../scripts/app.js",
        // "./models/index.esm.js", // Keep dynamic import external
    ],
    treeshake: true,
    publicDir: "web/src/public",
});
