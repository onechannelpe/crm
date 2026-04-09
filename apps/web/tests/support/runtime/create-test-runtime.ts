import { createAuthRuntime } from "~/server/runtime/auth-runtime";

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
  auth: ReturnType<typeof createAuthRuntime>;
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

  const auth = createAuthRuntime({
    db: ctx.db,
    now: now.get,
    logger,
  });

  return {
    ctx,
    now,
    auth,
    async dispose() {
      await cleanupTestDb(ctx);
    },
  };
}
