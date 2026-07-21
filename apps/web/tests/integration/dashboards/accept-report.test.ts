import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  TEST_FIXTURES,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { acceptReport } from "~/server/merchant-stats/commands/accept-report";

const UPLOADER = TEST_FIXTURES.users.superUser.id;

function reportInput(overrides: { contentSha256: string; now?: Date }) {
  return {
    contentSha256: overrides.contentSha256,
    cutAt: new Date("2026-07-01T00:00:00.000Z"),
    storageKey: `imports/${overrides.contentSha256}.xlsx`,
    sourceFilename: "gpv.xlsx",
    uploadedBy: UPLOADER,
    now: overrides.now ?? new Date("2026-07-02T00:00:00.000Z"),
  };
}

function countImports(ctx: TestDbContext) {
  return ctx.db
    .selectFrom("merchant_report_imports")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();
}

describe("accept report", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("accept-report");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("queues an import for the first upload of a content hash", async () => {
    const result = await acceptReport(
      ctx.db,
      reportInput({ contentSha256: "a".repeat(64) }),
    );

    expect(result.kind).toBe("accepted");
    expect((await countImports(ctx)).count).toBe(1);
  });

  it("reports a re-upload as a duplicate without queuing a second import", async () => {
    const first = await acceptReport(
      ctx.db,
      reportInput({ contentSha256: "b".repeat(64) }),
    );

    const second = await acceptReport(
      ctx.db,
      reportInput({ contentSha256: "b".repeat(64) }),
    );

    expect(second).toEqual({
      kind: "duplicate",
      reportId: first.kind === "accepted" ? first.reportId : null,
    });

    expect((await countImports(ctx)).count).toBe(1);
  });

  it("treats a report committed mid-flight as a duplicate", async () => {
    const contentSha256 = "e".repeat(64);

    // Keep the competing insert uncommitted so acceptReport blocks on the
    // unique constraint instead of seeing the row during its initial read.
    const competitor = await ctx.db.startTransaction().execute();

    await competitor
      .insertInto("merchant_reports")
      .values({
        content_sha256: contentSha256,
        cut_at: new Date("2026-07-01T00:00:00.000Z"),
        storage_key: `imports/${contentSha256}.xlsx`,
        source_filename: "gpv.xlsx",
        uploaded_by: UPLOADER,
        created_at: new Date("2026-07-02T00:00:00.000Z"),
      })
      .execute();

    const accepting = acceptReport(ctx.db, reportInput({ contentSha256 }));

    await new Promise((resolve) => setTimeout(resolve, 200));
    await competitor.commit().execute();

    expect((await accepting).kind).toBe("duplicate");
    expect((await countImports(ctx)).count).toBe(0);
  });

  it("leaves a caller-owned transaction usable after a duplicate", async () => {
    await acceptReport(ctx.db, reportInput({ contentSha256: "c".repeat(64) }));

    const outcome = await ctx.db.transaction().execute(async (trx) => {
      const duplicate = await acceptReport(
        trx,
        reportInput({ contentSha256: "c".repeat(64) }),
      );

      const accepted = await acceptReport(
        trx,
        reportInput({ contentSha256: "d".repeat(64) }),
      );

      return { duplicate, accepted };
    });

    expect(outcome.duplicate.kind).toBe("duplicate");
    expect(outcome.accepted.kind).toBe("accepted");
    expect((await countImports(ctx)).count).toBe(2);
  });

  it("cascades the import away when its report is deleted", async () => {
    const accepted = await acceptReport(
      ctx.db,
      reportInput({ contentSha256: "f".repeat(64) }),
    );

    await ctx.db
      .deleteFrom("merchant_reports")
      .where("content_sha256", "=", "f".repeat(64))
      .execute();

    expect(accepted.kind).toBe("accepted");
    expect((await countImports(ctx)).count).toBe(0);
  });
});
