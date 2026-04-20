import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLeadDetail } from "../../src/server/pipeline/application/queries/get-lead-detail";
import { getSaleDetail } from "../../src/server/pipeline/application/queries/get-sale-detail";
import { asUserId } from "../../src/server/shared/ids";
import { insertTestLead } from "../support/pipeline/fixtures";
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
    const leadId = await insertTestLead({
      db: runtime.ctx.db,
      ruc: "20100000011",
      razonSocial: "Org Test",
    });

    const result = await getLeadDetail(runtime.pipeline.deps.leadDetail, {
      leadId,
      actorUserId: asUserId("2"),
      actorRole: "back_office",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.lead.id).toBe(leadId);
    expect(result.value.timeline).toEqual([]);
  });

  it("blocks executives from reading another executive's record detail", async () => {
    const leadId = await insertTestLead({
      db: runtime.ctx.db,
      ruc: "20100000012",
      razonSocial: "Org Test",
    });

    const result = await getLeadDetail(runtime.pipeline.deps.leadDetail, {
      leadId,
      actorUserId: asUserId("3"),
      actorRole: "executive",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("forbidden");
  });

  it("lets an executive read only their own sale detail", async () => {
    const leadId = await insertTestLead({
      db: runtime.ctx.db,
      stage: "READY_FOR_SALE",
      ruc: "20100000021",
      razonSocial: "Sale Org A",
    });

    await runtime.ctx.db
      .insertInto("pipeline_sales")
      .values({
        id: 21 as any,
        lead_id: leadId,
        executive_id: asUserId("user-1"),
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

    const result = await getSaleDetail(runtime.pipeline.deps.saleQueries, {
      saleId: 21 as any,
      actorUserId: asUserId("user-1"),
      actorRole: "executive",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.id).toBe(21);
  });

  it("blocks an executive from reading another executive's sale detail", async () => {
    const leadId = await insertTestLead({
      db: runtime.ctx.db,
      stage: "READY_FOR_SALE",
      ruc: "20100000022",
      razonSocial: "Sale Org B",
    });

    await runtime.ctx.db
      .insertInto("pipeline_sales")
      .values({
        id: 22 as any,
        lead_id: leadId,
        executive_id: asUserId("user-1"),
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

    const result = await getSaleDetail(runtime.pipeline.deps.saleQueries, {
      saleId: 22 as any,
      actorUserId: asUserId("3"),
      actorRole: "executive",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("forbidden");
  });
});
