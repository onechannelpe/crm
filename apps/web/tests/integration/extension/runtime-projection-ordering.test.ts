import { expectOk } from "@tests/support/_core/assertions";
import { createExtensionScenario } from "@tests/support/extension/api";
import {
  createExtensionFixture,
  disposeExtensionFixture,
} from "@tests/support/extension/fixture";
import type { TestDbContext } from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("extension runtime projection ordering", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createExtensionFixture("extension-runtime-projection-ordering");
  });

  afterEach(async () => {
    await disposeExtensionFixture(ctx);
  });

  it("keeps the newest presence projection regardless of write order", async () => {
    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: 1,
      branch_id: 1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-new",
      presence_status: "active",
      presence_updated_at: 2_000,
      source_event_id: "evt-new",
      source_event_sequence: 2,
    });

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: 1,
      branch_id: 1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-old",
      presence_status: "dialing",
      presence_updated_at: 1_000,
      source_event_id: "evt-old",
      source_event_sequence: 1,
    });

    const current = await ctx.repos.extensionRuntime.findCurrentStatusByUser(1);
    expect(current?.presence_status).toBe("active");
    expect(current?.presence_updated_at).toBe(2_000);
    expect(current?.call_session_id).toBe("call-new");
    expect(current?.source_event_sequence).toBe(2);
  });

  it("breaks equal timestamp ties by higher source sequence", async () => {
    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: 1,
      branch_id: 1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-low",
      presence_status: "dialing",
      presence_updated_at: 3_000,
      source_event_id: "evt-low",
      source_event_sequence: 1,
    });

    await ctx.repos.extensionRuntime.upsertExecutivePresence({
      user_id: 1,
      branch_id: 1,
      assignment_id: null,
      contact_id: null,
      call_session_id: "call-high",
      presence_status: "active",
      presence_updated_at: 3_000,
      source_event_id: "evt-high",
      source_event_sequence: 2,
    });

    const current = await ctx.repos.extensionRuntime.findCurrentStatusByUser(1);
    expect(current?.presence_status).toBe("active");
    expect(current?.call_session_id).toBe("call-high");
    expect(current?.source_event_sequence).toBe(2);
  });

  it("keeps shared sync ok when heartbeat freshness is recent", async () => {
    const fixedNow = 1_000_000;
    const scenario = createExtensionScenario(ctx, () => fixedNow);
    await ctx.db
      .insertInto("extension_executive_statuses")
      .values({
        user_id: 1,
        branch_id: 1,
        assignment_id: null,
        contact_id: null,
        call_session_id: null,
        presence_status: "ready",
        presence_updated_at: fixedNow - 5 * 60_000,
        sync_health: "ok",
        sync_updated_at: fixedNow - 30_000,
        source_event_id: "heartbeat",
        source_event_sequence: 7,
      })
      .execute();

    const result = await scenario.service.listTeamExecutiveStatuses({
      role: "sales_manager",
      userId: 2,
      branchId: 1,
    });

    const value = expectOk(result);
    expect(value[0]?.presenceStatus).toBe("offline");
    expect(value[0]?.syncHealth).toBe("ok");
  });

  it("marks shared sync stale when heartbeat freshness expires", async () => {
    const fixedNow = 1_000_000;
    const scenario = createExtensionScenario(ctx, () => fixedNow);
    await ctx.db
      .insertInto("extension_executive_statuses")
      .values({
        user_id: 1,
        branch_id: 1,
        assignment_id: null,
        contact_id: null,
        call_session_id: null,
        presence_status: "ready",
        presence_updated_at: fixedNow - 30_000,
        sync_health: "ok",
        sync_updated_at: fixedNow - 5 * 60_000,
        source_event_id: "heartbeat-old",
        source_event_sequence: 6,
      })
      .execute();

    const result = await scenario.service.listTeamExecutiveStatuses({
      role: "sales_manager",
      userId: 2,
      branchId: 1,
    });

    const value = expectOk(result);
    expect(value[0]?.presenceStatus).toBe("ready");
    expect(value[0]?.syncHealth).toBe("stale");
  });
});
