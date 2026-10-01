import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["esm"],
    platform: "node",
    target: "es2023",
    // `fixedExtension` defaults to true for platform "node", which forces
    // .mjs/.d.mts. The package is already `"type": "module"`, so those are
    // redundant — this keeps output as index.js/index.d.ts and matching the
    // `exports` map in package.json.
    fixedExtension: false,
    // Emits dist/index.d.ts alongside the bundle; also inferred from the
    // `types` field in package.json, but stated here so it is not accidental.
    dts: true,
    sourcemap: true,
    clean: true,
});
