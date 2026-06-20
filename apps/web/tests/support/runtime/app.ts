import { uploadsConfig } from "~/lib/env";
import { noopQueueDoorbell } from "~/lib/job-queue/doorbell";
import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createSessionService } from "~/server/auth/session/session.service";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import { createFilesRuntime } from "~/server/platform/container/files-runtime";
import type { ServerInfra } from "~/server/platform/container/infra";
import { createWorkflowRuntime } from "~/server/platform/container/workflow-runtime";
import type { EngineClient } from "~/server/shared/engine/client";
import type { SearchResult } from "~/server/shared/engine/types";
import { createEventsRepo } from "~/server/shared/repos-events";

import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "./db";

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
    get(): number;
    set(value: number): void;
  };
  auth: {
    sessionService: ReturnType<typeof createSessionService>;
  };
  workflow: ReturnType<typeof createWorkflowRuntime>;
  integrations: ReturnType<typeof createIntegrationRuntime>;
  engine: { company(ruc: string, overlay: CompanyOverlay): void };
  dispose(): Promise<void>;
}

export async function createTestRuntime(prefix: string): Promise<TestRuntime> {
  const ctx = await createIsolatedTestDb(prefix);

  let currentNow = Date.now();

  const now = {
    get: () => currentNow,
    set: (value: number) => {
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

  const infra: ServerInfra = {
    db: ctx.db,
    now: now.get,
    logger,
  };

  const files = createFilesRuntime(infra, uploadsConfig());

  const engine = createFakeEngine();

  const workflow = createWorkflowRuntime(
    infra,
    engine.client,
    files,
    noopQueueDoorbell,
  );
  const integrations = createIntegrationRuntime(ctx.db);

  return {
    ctx,
    now,
    auth,
    workflow,
    integrations,
    engine: { company: (ruc, overlay) => engine.company(ruc, overlay) },

    async dispose() {
      await cleanupTestDb(ctx);
    },
  };
}
