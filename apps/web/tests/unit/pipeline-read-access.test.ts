import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findLeadById: vi.fn(),
  findCommercialInputByLeadId: vi.fn(),
  listQuotationsByLead: vi.fn(),
  findSaleById: vi.fn(),
}));

vi.mock("../../src/server/shared/pipeline-runtime", () => ({
  pipelineRepos: {
    leads: {
      findById: mocks.findLeadById,
    },
    leadCommercialInputs: {
      findByLeadId: mocks.findCommercialInputByLeadId,
    },
    quotations: {
      listByLead: mocks.listQuotationsByLead,
    },
    sales: {
      findById: mocks.findSaleById,
    },
  },
}));

import { getLeadDetailQuery } from "../../src/server/leads/application/get-lead-detail";
import { getSaleDetailQuery } from "../../src/server/sales/application/get-sale-detail";

describe("pipeline read access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findCommercialInputByLeadId.mockResolvedValue(undefined);
    mocks.listQuotationsByLead.mockResolvedValue([]);
  });

  it("lets review users read lead detail even when they are not the assigned executive", async () => {
    mocks.findLeadById.mockResolvedValue({
      id: 11,
      executive_id: 1,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: null,
      prioridad: null,
      ruc: "20100000001",
      razon_social: "Org Test",
      address: null,
      created_at: 10,
      updated_at: 10,
    });

    const result = await getLeadDetailQuery({
      leadId: 11,
      actorUserId: 99,
      actorRole: "back_office",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.lead.id).toBe(11);
    expect(mocks.findCommercialInputByLeadId).toHaveBeenCalledWith(11);
    expect(mocks.listQuotationsByLead).toHaveBeenCalledWith(11);
  });

  it("blocks executives from reading another executive's lead detail", async () => {
    mocks.findLeadById.mockResolvedValue({
      id: 11,
      executive_id: 1,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: null,
      prioridad: null,
      ruc: "20100000001",
      razon_social: "Org Test",
      address: null,
      created_at: 10,
      updated_at: 10,
    });

    const result = await getLeadDetailQuery({
      leadId: 11,
      actorUserId: 2,
      actorRole: "executive",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("forbidden");
  });

  it("lets an executive read only their own sale detail", async () => {
    mocks.findSaleById.mockResolvedValue({
      id: 21,
      lead_id: 11,
      executive_id: 7,
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
    });

    const result = await getSaleDetailQuery({
      saleId: 21,
      actorUserId: 7,
      actorRole: "executive",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.id).toBe(21);
  });

  it("blocks an executive from reading another executive's sale detail", async () => {
    mocks.findSaleById.mockResolvedValue({
      id: 21,
      lead_id: 11,
      executive_id: 7,
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
    });

    const result = await getSaleDetailQuery({
      saleId: 21,
      actorUserId: 8,
      actorRole: "executive",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.kind).toBe("forbidden");
  });
});
