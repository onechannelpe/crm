import { afterAll, beforeAll, bench, describe } from "vitest";

import { isLockExpired } from "~/server/inventory/domain";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const LOCK_GROUP_COUNT = 80;
const LOCKS_PER_GROUP = 4;
const INVENTORY_ID_START = 50_000;
const EXPIRY_BASE = 10_000_000;

describe("inventory lock cleanup performance", () => {
  let ctx: TestDbContext | null = null;
  let nowValues: number[] = [];
  let nowCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("inventory-release-locks-bench");
    const benchCtx = ctx;
    if (!benchCtx) {
      throw new Error("expected benchmark db context");
    }

    for (let group = 0; group < LOCK_GROUP_COUNT; group += 1) {
      const expiry = EXPIRY_BASE + group;
      nowValues.push(expiry + 1);

      for (let offset = 0; offset < LOCKS_PER_GROUP; offset += 1) {
        const itemId =
          INVENTORY_ID_START + group * LOCKS_PER_GROUP + offset;
        // oxlint-disable-next-line eslint(no-await-in-loop)
        const noteId = await benchCtx.repos.chargeNotes.create(1, 1);
        // oxlint-disable-next-line eslint(no-await-in-loop)
        await benchCtx.db
          .insertInto("inventory_items")
          .values({
            id: itemId,
            product_id: 1,
            serial_number: `SN-LOCK-${itemId}`,
            status: "reserved",
            created_at: EXPIRY_BASE,
          })
          .execute();
        // oxlint-disable-next-line eslint(no-await-in-loop)
        await benchCtx.repos.inventory.createLock(itemId, noteId, expiry);
      }
    }
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  bench(
    "action path: release one expired lock group",
    async () => {
      const now = nowValues[nowCursor];
      nowCursor += 1;
      if (now === undefined) {
        throw new Error("benchmark pool exhausted before iterations completed");
      }

      const released = await ctx!.repos.inventory.releaseExpiredLocks(now);
      if (released !== LOCKS_PER_GROUP) {
        throw new Error(
          `expected ${LOCKS_PER_GROUP} released locks, got ${released}`,
        );
      }
    },
    fixedIterations(LOCK_GROUP_COUNT),
  );

  bench(
    "component path: evaluate lock expiry",
    () => {
      const expired = isLockExpired(EXPIRY_BASE, EXPIRY_BASE + 1);
      if (!expired) {
        throw new Error("expected lock to be expired");
      }
    },
    fixedIterations(25_000),
  );
});
