import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../../src/lib/db/client";
import { up as up001 } from "../../src/lib/db/migrations/001-initial";
import { up as up002 } from "../../src/lib/db/migrations/002-client-search-views";
import { up as up003 } from "../../src/lib/db/migrations/003-user-invites";
import { up as up004 } from "../../src/lib/db/migrations/004-action-observability";
import { up as up005 } from "../../src/lib/db/migrations/005-report-export-observability";
import { up as up006 } from "../../src/lib/db/migrations/006-sales-records-core";
import { up as up007 } from "../../src/lib/db/migrations/007-action-rate-limit";
import { up as up008 } from "../../src/lib/db/migrations/008-search-enrichment";
import { up as up009 } from "../../src/lib/db/migrations/009-extension-runtime";
import { getStrongAuthStatus } from "../../src/lib/auth/security/strong-auth-status";
import { createRepositories } from "../../src/server/shared/registry";

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
      await up001(db);
      await up002(db);
      await up003(db);
      await up004(db);
      await up005(db);
      await up006(db);
      await up007(db);
      await up008(db);
      await up009(db);
      process.env.WEB_DB_PATH = dbPath;
      const { seedIfEmpty } = await import("../../src/lib/db/seed");
      await seedIfEmpty();

      const repos = createRepositories(db);
      const valeria = await repos.users.findByUsername("valeria.paredes");
      const manager = await repos.users.findById(12);

      expect(valeria?.onboarding_completed_at).toBeNull();
      expect(valeria?.strong_auth_required).toBe(1);

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
