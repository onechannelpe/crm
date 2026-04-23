import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLeadDetail } from "../../src/server/workflow/application/queries/get-lead-detail";
import { getSaleDetail } from "../../src/server/workflow/application/queries/get-sale-detail";
import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";

describe("pipeline read access", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("pipeline-read-access");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("lets review users read record detail even when they are not the assigned executive", async () => {
    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-11",
        executive_id: 1,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        ruc: "20100000011",
        razon_social: "Org Test",
        address: null,
        created_by: 1,
        created_at: 10,
        updated_at: 10,
      })
      .execute();

    const result = await getLeadDetail(runtime.workflow.deps.leadDetail, {
      leadId: "lead-11",
      actorUserId: 2,
      actorRole: "back_office",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.lead.id).toBe("lead-11");
    expect(result.value.timeline).toEqual([]);
  });

  it("blocks executives from reading another executive's record detail", async () => {
    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-12",
        executive_id: 1,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        ruc: "20100000012",
        razon_social: "Org Test",
        address: null,
        created_by: 1,
        created_at: 10,
        updated_at: 10,
      })
      .execute();

    const result = await getLeadDetail(runtime.workflow.deps.leadDetail, {
      leadId: "lead-12",
      actorUserId: 3,
      actorRole: "executive",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("forbidden");
  });

  it("lets an executive read only their own sale detail", async () => {
    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-21",
        executive_id: 1,
        stage: "READY_FOR_SALE",
        status: null,
        prioridad: null,
        ruc: "20100000021",
        razon_social: "Sale Org A",
        address: null,
        created_by: 1,
        created_at: 10,
        updated_at: 10,
      })
      .execute();

    await runtime.ctx.db
      .insertInto("workflow_sales")
      .values({
        id: "sale-21",
        lead_id: "lead-21",
        executive_id: 1,
        proveedor_actual: "Banco A",
        tasa_actual: 1.1,
        gpv: 1000,
        ticket: 50,
        abono: 10,
        cantidad_pos: 2,
        banco: "BCP",
        nro_cuenta: "123",
        cci: null,
        created_at: 10,
      })
      .execute();

    const result = await getSaleDetail(runtime.workflow.deps.saleQueries, {
      saleId: "sale-21",
      actorUserId: 1,
      actorRole: "executive",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.id).toBe("sale-21");
  });

  it("blocks an executive from reading another executive's sale detail", async () => {
    await runtime.ctx.db
      .insertInto("workflow_leads")
      .values({
        id: "lead-22",
        executive_id: 1,
        stage: "READY_FOR_SALE",
        status: null,
        prioridad: null,
        ruc: "20100000022",
        razon_social: "Sale Org B",
        address: null,
        created_by: 1,
        created_at: 10,
        updated_at: 10,
      })
      .execute();

    await runtime.ctx.db
      .insertInto("workflow_sales")
      .values({
        id: "sale-22",
        lead_id: "lead-22",
        executive_id: 1,
        proveedor_actual: "Banco A",
        tasa_actual: 1.1,
        gpv: 1000,
        ticket: 50,
        abono: 10,
        cantidad_pos: 2,
        banco: "BCP",
        nro_cuenta: "123",
        cci: null,
        created_at: 10,
      })
      .execute();

    const result = await getSaleDetail(runtime.workflow.deps.saleQueries, {
      saleId: "sale-22",
      actorUserId: 3,
      actorRole: "executive",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("forbidden");
  });
});
