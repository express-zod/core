import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "express-zod": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
        },
    },
    test: {
        globals: true,
        environment: "node",
        include: ["__test__/**/*.test.ts"],
        typecheck: {
            enabled: true,
            include: ["__test__/**/*.test-d.ts"],
        },
    },
});
