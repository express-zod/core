import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["esm", "cjs"],
    platform: "node",
    target: "es2023",
    fixedExtension: true,
    dts: true,
    clean: true,
});
