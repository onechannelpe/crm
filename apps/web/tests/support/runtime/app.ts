import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createSessionService } from "~/server/auth/session/session.service";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import type { EngineClient } from "~/server/shared/engine/client";
import type { SearchResult } from "~/server/shared/engine/types";
import { createEventsRepo } from "~/server/shared/repos-events";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "./db";

interface TestLogger {
  info(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

type CompanyOverlay = { legalName: string | null; address?: string | null };

function createFakeEngine() {
  const companies = new Map<string, CompanyOverlay>();

  const client: EngineClient = {
    async search(intent, query) {
      if (intent !== "companies") return { ok: true, value: [] };
      const overlay = companies.get(query);
      const value = overlay ? [companyResult(query, overlay)] : [];
      return { ok: true, value };
    },
    async requestCandidates() {
      return { ok: true, value: [] };
    },
  };

  return {
    client,
    company(ruc: string, overlay: CompanyOverlay) {
      companies.set(ruc, overlay);
    },
    clear() {
      companies.clear();
    },
  };
}

function companyResult(ruc: string, overlay: CompanyOverlay): SearchResult {
  return {
    kind: "company",
    company: {
      id: 0,
      ruc,
      legal_name: overlay.legalName,
      trade_name: null,
      company_type: null,
      status: null,
      condition: null,
      fiscal_address: overlay.address ?? null,
      registration_date: null,
      activity_start_date: null,
      line_of_business: null,
      economic_activity: null,
      ubigeo_code: null,
      department: null,
      province: null,
      district: null,
    },
    rep: null,
    phones: { primary: null, secondary: null, siblings: null },
  };
}

export interface TestRuntime {
  ctx: TestDbContext;
  now: {
    get(): Date;
    set(value: Date): void;
  };
  auth: {
    sessionService: ReturnType<typeof createSessionService>;
  };
  integrations: ReturnType<typeof createIntegrationRuntime>;
  engine: {
    client: EngineClient;
    company(ruc: string, overlay: CompanyOverlay): void;
  };
  // Restores the shared database to its seeded baseline and resets the clock
  // to a fresh `new Date()`. Call this in `beforeEach` — the runtime itself
  // is built once per file in `beforeAll`.
  reset(): Promise<void>;
  dispose(): Promise<void>;
}

export async function createTestRuntime(prefix: string): Promise<TestRuntime> {
  const ctx = await createIsolatedTestDb(prefix);

  let currentNow = new Date();

  const now = {
    get: () => currentNow,
    set: (value: Date) => {
      currentNow = value;
    },
  };

  const logger: TestLogger = {
    info() {},
    error() {},
  };

  const auth = {
    sessionService: createSessionService({
      sessions: createAuthSessionRepo(ctx.db),
      users: createAuthUsersRepo(ctx.db),
      events: createEventsRepo(ctx.db),
      now: now.get,
      logger,
    }),
  };

  const engine = createFakeEngine();
  const integrations = createIntegrationRuntime({
    executor: ctx.db,
    now: now.get,
  });

  return {
    ctx,
    now,
    auth,
    integrations,
    engine: {
      client: engine.client,
      company: (ruc, overlay) => engine.company(ruc, overlay),
    },

    async reset() {
      await resetTestDb(ctx);
      currentNow = new Date();
      engine.clear();
    },

    async dispose() {
      await cleanupTestDb(ctx);
    },
  };
}
