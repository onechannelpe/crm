import type { SearchResult } from "~/contracts/search/engine-results.generated";
import { createSessionService } from "~/server/auth/session/session.service";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import { createFilesRuntime } from "~/server/files/runtime";
import type { EngineClient } from "~/server/integrations/engine/client";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import { createOrganizationEnrichment } from "~/server/organization/enrichment";
import type { ServerInfrastructure } from "~/server/platform/infrastructure";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createUsersRepo } from "~/server/users/repos-users";
import { createWorkflowRuntime } from "~/server/workflow/runtime";

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
  // Transitional test data needed by fixtures that model time passing. New
  // operation calls receive an explicit OperationContext instead.
  now: {
    get(): Date;
    set(value: Date): void;
  };
  auth: {
    sessionService: ReturnType<typeof createSessionService>;
  };
  integrations: ReturnType<typeof createIntegrationRuntime>;
  workflow: ReturnType<typeof createWorkflowRuntime>;
  engine: {
    client: EngineClient;
    company(ruc: string, overlay: CompanyOverlay): void;
  };
  // Restores the shared database to its seeded baseline and resets fixture
  // time. Call this in `beforeEach`; the runtime itself is built once per
  // file in `beforeAll`.
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
      sessions: createSessionRepository(ctx.db),
      users: createUsersRepo(ctx.db),
      events: createEventsRepo(ctx.db),
      logger,
    }),
  };

  const engine = createFakeEngine();
  const infrastructure: ServerInfrastructure = {
    db: ctx.db,
    logger,
  };
  const files = createFilesRuntime(infrastructure, {
    storageRoot: ctx.storageRoot,
  });
  const workflow = createWorkflowRuntime(
    infrastructure,
    files,
    createOrganizationEnrichment(engine.client),
    { enqueueRucVerification: async () => {} },
  );
  const integrations = createIntegrationRuntime({
    executor: ctx.db,
  });

  return {
    ctx,
    now,
    auth,
    integrations,
    workflow,
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
