import { createSessionService } from "~/server/auth/application/session-service";
import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createFileStorage } from "~/server/files/storage";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import { createPipelineRuntime } from "~/server/runtime/pipeline-runtime";
import { createSalesExportService } from "~/server/sales/export-service";
import { createReportExportRepo } from "~/server/sales/repos-report-exports";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";

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
  pipeline: ReturnType<typeof createPipelineRuntime>;
  sales: {
    salesExportBlobStore: ReturnType<typeof createFileStorage>;
    salesExportService: ReturnType<typeof createSalesExportService>;
  };
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
  const pipeline = createPipelineRuntime({
    db: ctx.db,
    now: now.get,
    logger,
  });
  const salesExportBlobStore = createFileStorage(ctx.storageRoot);
  const salesExportService = createSalesExportService(
    {
      reportExportJobs: createReportExportRepo(ctx.db),
      salesRecords: createSalesRecordsRepo(ctx.db),
    },
    salesExportBlobStore,
  );
  const integrations = createIntegrationRuntime(ctx.db);

  return {
    ctx,
    now,
    auth,
    pipeline,
    sales: {
      salesExportBlobStore,
      salesExportService,
    },
    integrations,
    async dispose() {
      await cleanupTestDb(ctx);
    },
  };
}
