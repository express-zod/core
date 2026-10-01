import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    // Dual output. The Express ecosystem still has a large CommonJS
    // population, and `require("express-zod")` has to work for them.
    format: ["esm", "cjs"],
    platform: "node",
    target: "es2023",
    // `true` is what keeps the two formats distinguishable: ESM lands as
    // index.mjs/index.d.mts, CJS as index.cjs/index.d.cts. Setting this to
    // false emits both as index.js and they collide. The `exports` map in
    // package.json is written against these exact extensions — change one
    // and you must change both.
    fixedExtension: true,
    // Emits the .d.mts/.d.cts pair alongside the bundles; also inferred from
    // the `types` field in package.json, but stated here so it is deliberate.
    dts: true,
    sourcemap: true,
    clean: true,
});
