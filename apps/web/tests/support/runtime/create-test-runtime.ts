import { createSessionService } from "~/server/auth/application/session-service";
import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import type { ServerInfra } from "~/server/runtime/infra";
import { createWorkflowRuntime } from "~/server/runtime/workflow-runtime";
import type { EngineClient } from "~/server/shared/engine/client";
import { Ok } from "~/server/shared/result";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../test-db";

interface TestLogger {
  info(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
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
      now: now.get,
      logger,
    }),
  };

  const engine: EngineClient = {
    async search() {
      return Ok([]);
    },
    async requestCandidates() {
      return Ok([]);
    },
  };

  const infra: ServerInfra = {
    db: ctx.db,
    now: now.get,
    logger,
  };

  const workflow = createWorkflowRuntime(infra, engine);
  const integrations = createIntegrationRuntime(ctx.db);

  return {
    ctx,
    now,
    auth,
    workflow,
    integrations,
    async dispose() {
      await cleanupTestDb(ctx);
    },
  };
}
