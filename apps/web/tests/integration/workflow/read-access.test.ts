import { expectErr, expectOk } from "@tests/support/_core/assertions";
import {
  actorBy,
  actorWithRole,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { workflowRepos } from "@tests/support/integration/workflow-ports";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";

describe("workflow read access", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("workflow-read-access");
    runtime.now.set(10);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("lets review users read record detail even when they are not the assigned executive", async () => {
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "qualifying",
      key: "read-access-back-office",
      organization: { key: "read-access-back-office" },
    });

    const actor = actorBy("backOne");
    const result = await getLeadDetail(workflowRepos(runtime), {
      actorUserId: actor.userId,
      actorRole: actor.role,
      leadId: lead.id,
    });

    const value = expectOk(result);
    expect(value.lead.id).toBe(lead.id);
    expect(value.timeline).toEqual([]);
  });

  it.each(["supervisor", "sales_manager"] as const)(
    "lets %s read record detail even when they are not the assigned executive",
    async (role) => {
      const lead = await createLeadFixtureWriter(runtime)({
        kind: "pricing",
        key: `read-access-${role}`,
        organization: { key: `read-access-${role}` },
        proposal: "none",
      });

      const actor = actorWithRole("backOne", role);
      const result = await getLeadDetail(workflowRepos(runtime), {
        actorUserId: actor.userId,
        actorRole: actor.role,
        leadId: lead.id,
      });

      const value = expectOk(result);
      expect(value.lead.id).toBe(lead.id);
    },
  );

  it("blocks executives from reading another executive's record detail", async () => {
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "qualifying",
      key: "read-access-exec-blocked",
      organization: { key: "read-access-exec-blocked" },
    });

    const actor = actorBy("execTwo");
    const result = await getLeadDetail(workflowRepos(runtime), {
      actorUserId: actor.userId,
      actorRole: actor.role,
      leadId: lead.id,
    });

    const error = expectErr(result);
    expect(error.kind).toBe("forbidden");
  });
});
