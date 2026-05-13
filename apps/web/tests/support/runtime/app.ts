import { createSessionService } from "~/server/auth/application/session-service";
import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import type { ServerInfra } from "~/server/runtime/infra";
import { createWorkflowRuntimeWithGateway } from "~/server/runtime/workflow-runtime";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";

import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "./db";

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
  workflow: ReturnType<typeof createWorkflowRuntimeWithGateway>;
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

  const engineGateway: WorkflowEngineGateway = {
    async enrichByRuc() {
      return null;
    },
  };

  const infra: ServerInfra = {
    db: ctx.db,
    now: now.get,
    logger,
  };

  const workflow = createWorkflowRuntimeWithGateway({
    executor: infra.db,
    engineGateway,
  });
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
