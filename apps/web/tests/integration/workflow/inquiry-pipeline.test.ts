import { expectErr } from "@tests/support/_core/assertions";
import { actorBy } from "@tests/support/database/workflow-fixtures";
import { seedImportJob } from "@tests/support/database/workflow-seed";
import { createWorkflowImporter } from "@tests/support/integration/workflow-import";
import { registerLeadPorts } from "@tests/support/integration/workflow-ports";
import { createNotificationReader } from "@tests/support/readers/notifications";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { WorkflowInquiryId } from "~/server/shared/ids";
import { createInquiry } from "~/server/workflow/inquiry/create-inquiry";
import { registerLead } from "~/server/workflow/lead/commands/register-lead";

const RUC = "20909090901";

describe("inquiry pipeline", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("inquiry-pipeline");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
  });

  function ports() {
    return {
      executor: runtime.ctx.db,
      now: runtime.now.get(),
    };
  }

  async function inquiryRow(id: string) {
    return runtime.ctx.db
      .selectFrom("workflow_inquiries")
      .selectAll()
      .where("id", "=", WorkflowInquiryId.trust(id))
      .executeTakeFirstOrThrow();
  }

  async function createPendingInquiry() {
    const created = await createInquiry(
      { ruc: RUC, actor: actorBy("execOne") },
      ports(),
    );
    if (!created.ok) throw new Error(`inquiry failed: ${created.error.code}`);
    return created.value.inquiryId;
  }

  async function importAnswer() {
    const job = await seedImportJob(runtime);
    return createWorkflowImporter({ runtime }).apply({
      jobId: job.id,
      actorId: actorBy("backOne").userId,
      rows: [
        { row: 1, ruc: RUC, type: "import_status", status: "DISPONIBLE" },
        { row: 2, ruc: RUC, type: "import_prioridad", priority: "P1" },
      ],
    });
  }

  it("rejects a duplicate live inquiry for the same executive and RUC", async () => {
    await createPendingInquiry();

    const duplicate = await createInquiry(
      { ruc: RUC, actor: actorBy("execOne") },
      ports(),
    );

    expect(expectErr(duplicate).code).toBe("inquiry_exists");
  });

  it("answers pending inquiries from an import with no matching lead and notifies the executive", async () => {
    const inquiryId = await createPendingInquiry();

    const applied = await importAnswer();

    // Both rows land on the inquiry; neither counts as "RUC not found".
    expect(applied.applied).toBe(2);
    expect(applied.failed).toBe(0);

    const row = await inquiryRow(inquiryId);
    expect(row.state).toBe("ANSWERED");
    expect(row.status).toBe("DISPONIBLE");
    expect(row.priority).toBe("P1");
    expect(row.answered_by).toBe(actorBy("backOne").userId);

    const intents = await createNotificationReader(runtime).intents();
    expect(intents).toHaveLength(1);
  });

  it("carries a fresh answer onto the lead when the inquiry converts", async () => {
    const inquiryId = await createPendingInquiry();
    await importAnswer();

    const registered = await registerLead(
      {
        actor: actorBy("execOne"),
        ruc: RUC,
        inquiryId: WorkflowInquiryId.trust(inquiryId),
        currentProvider: "Izipay",
        currentDebitRate: 3,
        currentCreditRate: 3.5,
        gpv: 10_000,
        ticket: 50,
        lineOfBusiness: "Retail",
        settlementBank: "BCP",
        posCount: 1,
      },
      registerLeadPorts(runtime),
    );
    if (!registered.ok) {
      throw new Error(`register failed: ${registered.error.code}`);
    }

    const lead = await runtime.ctx.db
      .selectFrom("workflow_leads")
      .select(["stage", "status", "priority"])
      .where("id", "=", registered.value.leadId)
      .executeTakeFirstOrThrow();
    expect(lead).toEqual({
      stage: "PRICING",
      status: "DISPONIBLE",
      priority: "P1",
    });

    const row = await inquiryRow(inquiryId);
    expect(row.state).toBe("CONVERTED");
    expect(row.converted_lead_id).toBe(registered.value.leadId);
  });

  it("blocks a new inquiry once the executive holds an active lead for the RUC", async () => {
    const inquiryId = await createPendingInquiry();
    await importAnswer();
    await registerLead(
      {
        actor: actorBy("execOne"),
        ruc: RUC,
        inquiryId: WorkflowInquiryId.trust(inquiryId),
        currentProvider: "Izipay",
        currentDebitRate: 3,
        currentCreditRate: 3.5,
        gpv: 10_000,
        ticket: 50,
        lineOfBusiness: "Retail",
        settlementBank: "BCP",
        posCount: 1,
      },
      registerLeadPorts(runtime),
    );

    const blocked = await createInquiry(
      { ruc: RUC, actor: actorBy("execOne") },
      ports(),
    );

    expect(expectErr(blocked).code).toBe("inquiry_lead_registered");
  });
});
