import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";

export function createBenchDbFixture(name: string) {
  let ctx: TestDbContext | null = null;

  return {
    async setup(): Promise<TestDbContext> {
      ctx = await createIsolatedTestDb(name);
      return ctx;
    },

    async teardown(): Promise<void> {
      if (ctx !== null) {
        await cleanupTestDb(ctx);
        ctx = null;
      }
    },

    ctx(): TestDbContext {
      if (ctx === null) {
        throw new Error("bench db fixture accessed before setup");
      }
      return ctx;
    },
  };
}
