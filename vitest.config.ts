import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            // Keeps the package name pointing at live source so tests exercise the
            // entry point without a build step. Mirrors `paths` in tsconfig.json.
            "express-zod": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
        },
    },
    test: {
        environment: "node",
        include: ["__test__/**/*.test.ts"],
    },
});
