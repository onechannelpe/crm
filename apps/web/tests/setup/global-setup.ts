import { rm } from "node:fs/promises";
import { join } from "node:path";

const ARTIFACT_DIR = join(process.cwd(), ".vitest-db");

export async function setup() {
    try {
        await rm(ARTIFACT_DIR, { recursive: true, force: true });
    } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "EBUSY") {
            throw error;
        }
    }

    return async () => {
        try {
            await rm(ARTIFACT_DIR, { recursive: true, force: true });
        } catch (error) {
            if (!(error instanceof Error) || !("code" in error) || error.code !== "EBUSY") {
                throw error;
            }
        }
    };
}
