import { expectOk } from "@tests/support/_core/assertions";
import { createExtensionScenario } from "@tests/support/extension/api";
import { createExtensionFixture } from "@tests/support/extension/fixture";
import {
  cleanupTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { EventId } from "~/server/shared/ids";

describe("extension runtime projection ordering", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createExtensionFixture("extension-runtime-projection-ordering");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("keeps the newest presence projection regardless of write order", async () => {
    const { execOne } = ctx.fixtures.users;
    const { lima } = ctx.fixtures.branches;
    const newerAt = new Date(2_000);
    const olderAt = new Date(1_000);

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: execOne.id,
      branch_id: lima.id,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-new",
      presence_status: "active",
      presence_updated_at: newerAt,
      source_event_id: EventId.trust("evt-new"),
      source_event_sequence: 2,
    });

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: execOne.id,
      branch_id: lima.id,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-old",
      presence_status: "dialing",
      presence_updated_at: olderAt,
      source_event_id: EventId.trust("evt-old"),
      source_event_sequence: 1,
    });

    const current = await ctx.repos.extensionRuntime.findCurrentStatusByUser(
      execOne.id,
    );
    expect(current?.presence_status).toBe("active");
    expect(current?.presence_updated_at).toEqual(newerAt);
    expect(current?.call_session_id).toBe("call-new");
    expect(current?.source_event_sequence).toBe(2);
  });

  it("breaks equal timestamp ties by higher source sequence", async () => {
    const { execOne } = ctx.fixtures.users;
    const { lima } = ctx.fixtures.branches;
    const updatedAt = new Date(3_000);

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: execOne.id,
      branch_id: lima.id,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-low",
      presence_status: "dialing",
      presence_updated_at: updatedAt,
      source_event_id: EventId.trust("evt-low"),
      source_event_sequence: 1,
    });

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: execOne.id,
      branch_id: lima.id,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-high",
      presence_status: "active",
      presence_updated_at: updatedAt,
      source_event_id: EventId.trust("evt-high"),
      source_event_sequence: 2,
    });

    const current = await ctx.repos.extensionRuntime.findCurrentStatusByUser(
      execOne.id,
    );
    expect(current?.presence_status).toBe("active");
    expect(current?.call_session_id).toBe("call-high");
    expect(current?.source_event_sequence).toBe(2);
  });

  it("keeps shared sync ok when heartbeat freshness is recent", async () => {
    const fixedNowMs = 1_000_000;
    const fixedNow = new Date(fixedNowMs);
    const scenario = createExtensionScenario(ctx, () => fixedNow);
    const { execOne, backOne } = ctx.fixtures.users;
    const { lima } = ctx.fixtures.branches;
    await ctx.db
      .insertInto("extension_executive_statuses")
      .values({
        user_id: execOne.id,
        branch_id: lima.id,
        assignment_id: null,
        contact_id: null,
        call_session_id: null,
        presence_status: "ready",
        presence_updated_at: new Date(fixedNowMs - 5 * 60_000),
        sync_health: "ok",
        sync_updated_at: new Date(fixedNowMs - 30_000),
        source_event_id: EventId.trust("heartbeat"),
        source_event_sequence: 7,
      })
      .execute();

    const result = await scenario.service.listTeamExecutiveStatuses({
      role: "sales_manager",
      userId: backOne.id,
      branchId: lima.id,
    });

    const value = expectOk(result);
    expect(value[0]?.presenceStatus).toBe("offline");
    expect(value[0]?.syncHealth).toBe("ok");
  });

  it("marks shared sync stale when heartbeat freshness expires", async () => {
    const fixedNowMs = 1_000_000;
    const fixedNow = new Date(fixedNowMs);
    const scenario = createExtensionScenario(ctx, () => fixedNow);
    const { execOne, backOne } = ctx.fixtures.users;
    const { lima } = ctx.fixtures.branches;
    await ctx.db
      .insertInto("extension_executive_statuses")
      .values({
        user_id: execOne.id,
        branch_id: lima.id,
        assignment_id: null,
        contact_id: null,
        call_session_id: null,
        presence_status: "ready",
        presence_updated_at: new Date(fixedNowMs - 30_000),
        sync_health: "ok",
        sync_updated_at: new Date(fixedNowMs - 5 * 60_000),
        source_event_id: EventId.trust("heartbeat-old"),
        source_event_sequence: 6,
      })
      .execute();

    const result = await scenario.service.listTeamExecutiveStatuses({
      role: "sales_manager",
      userId: backOne.id,
      branchId: lima.id,
    });

    const value = expectOk(result);
    expect(value[0]?.presenceStatus).toBe("ready");
    expect(value[0]?.syncHealth).toBe("stale");
  });
});
