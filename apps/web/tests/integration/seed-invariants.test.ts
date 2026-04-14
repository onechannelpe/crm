import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getStrongAuthStatus,
  requiresStrongAuthRole,
} from "../../src/lib/auth/security/strong-auth-status";
import { createDb } from "../../src/lib/db/client";
import { migrateToLatest } from "../../src/lib/db/migrate";
import { createTestRepositories } from "../support/test-repositories";

describe("seed invariants", () => {
  const artifactDir = join(process.cwd(), ".vitest-db");
  let dbPath = "";

  beforeEach(async () => {
    await mkdir(artifactDir, { recursive: true });
    dbPath = join(
      artifactDir,
      `seed-invariants-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
    );
  });

  afterEach(async () => {
    await rm(dbPath, { force: true });
  });

  it("keeps invited privileged users without verified strong factors", async () => {
    const db = createDb(dbPath);
    const previousDbPath = process.env.WEB_DB_PATH;

    try {
      await migrateToLatest(db);
      process.env.WEB_DB_PATH = dbPath;
      const { seedIfEmpty } = await import("../../src/lib/db/seed");
      await seedIfEmpty(db);

      const repos = createTestRepositories(db);
      const valeria = await repos.users.findByUsername("valeria.paredes");
      const manager = await repos.users.findById(12);

      expect(valeria?.onboarding_completed_at).toBeNull();
      expect(valeria && requiresStrongAuthRole(valeria.role)).toBe(true);

      if (valeria == null) throw new Error("valeria not found in seed");
      const valeriaStatus = await getStrongAuthStatus(valeria.id, repos);
      expect(valeriaStatus.hasVerifiedStrongAuth).toBe(false);
      expect(valeriaStatus.hasTotp).toBe(false);
      expect(valeriaStatus.hasPasskey).toBe(false);

      if (manager == null) throw new Error("manager not found in seed");
      const managerStatus = await getStrongAuthStatus(manager.id, repos);
      expect(managerStatus.hasVerifiedStrongAuth).toBe(true);
      expect(managerStatus.hasTotp).toBe(true);
    } finally {
      process.env.WEB_DB_PATH = previousDbPath;
      await db.destroy();
    }
  });
});
