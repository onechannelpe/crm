import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        globalSetup: ["./tests/setup/global-setup.ts"],
        include: ["tests/**/*.test.ts"],
        environment: "node",
        fileParallelism: false,
        alias: {
            "~": path.resolve(__dirname, "./src"),
        },
    },
});
