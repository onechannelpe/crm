import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getStrongAuthStatus,
  requiresStrongAuthRole,
} from "../../src/lib/auth/security/strong-auth-status";
import { createDb } from "../../src/lib/db/client";
import * as s00 from "../../src/lib/db/schema/00-core";
import * as s01 from "../../src/lib/db/schema/01-users-auth";
import * as s02 from "../../src/lib/db/schema/02-crm";
import * as s03 from "../../src/lib/db/schema/03-notifications";
import * as s04 from "../../src/lib/db/schema/04-products-sales";
import * as s05 from "../../src/lib/db/schema/05-observability";
import * as s06 from "../../src/lib/db/schema/06-extensions";
import * as s07 from "../../src/lib/db/schema/07-features";
import * as seed00 from "../../src/lib/db/seeds/00-audit-policies";
import { createRepositories } from "../../src/server/shared/registry";

const schemas = [s00, s01, s02, s03, s04, s05, s06, s07];
const seeds = [seed00];

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
      for (const module of schemas) {
        await module.createTables(db);
      }
      for (const module of seeds) {
        await module.run(db);
      }
      process.env.WEB_DB_PATH = dbPath;
      const { seedIfEmpty } = await import("../../src/lib/db/seed");
      await seedIfEmpty();

      const repos = createRepositories(db);
      const valeria = await repos.users.findByUsername("valeria.paredes");
      const manager = await repos.users.findById(12);

      expect(valeria?.onboarding_completed_at).toBeNull();
      expect(valeria && requiresStrongAuthRole(valeria.role)).toBe(true);

      const valeriaStatus = await getStrongAuthStatus(valeria!.id, repos);
      expect(valeriaStatus.hasVerifiedStrongAuth).toBe(false);
      expect(valeriaStatus.hasTotp).toBe(false);
      expect(valeriaStatus.hasPasskey).toBe(false);

      const managerStatus = await getStrongAuthStatus(manager!.id, repos);
      expect(managerStatus.hasVerifiedStrongAuth).toBe(true);
      expect(managerStatus.hasTotp).toBe(true);
    } finally {
      process.env.WEB_DB_PATH = previousDbPath;
      await db.destroy();
    }
  });
});
