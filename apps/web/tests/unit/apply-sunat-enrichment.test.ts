import { afterEach, describe, expect, it, vi } from "vitest";

import { applySunatEnrichment } from "~/server/pipeline/application/commands/apply-sunat-enrichment";
import type { LeadRepository } from "~/server/pipeline/application/ports/lead-repository";

function createLeadRepositoryDouble() {
  const updateByRuc = vi.fn<LeadRepository["updateByRuc"]>(async () => []);

  const repo = {
    insert: async () => "00000000-0000-0000-0000-000000000001",
    findById: async () => undefined,
    findByRuc: async () => undefined,
    findByRucMany: async () => [],
    updateById: async () => [],
    updateByRuc,
  } satisfies LeadRepository;

  return repo;
}

describe("applySunatEnrichment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores overlays for non-ruc documents", async () => {
    const leads = createLeadRepositoryDouble();

    await applySunatEnrichment({
      overlay: {
        documentType: "dni",
        documentValue: "12345678",
        legalName: "Persona",
        address: "Calle 1",
        district: "Lima",
        department: "Lima",
      },
      leads,
      now: 100,
    });

    expect(leads.updateByRuc).not.toHaveBeenCalled();
  });

  it("skips writes when overlay has only empty values", async () => {
    const leads = createLeadRepositoryDouble();

    await applySunatEnrichment({
      overlay: {
        documentType: "ruc",
        documentValue: "20123456789",
        legalName: "   ",
        address: null,
        district: "",
        department: " ",
      },
      leads,
      now: 123,
    });

    expect(leads.updateByRuc).not.toHaveBeenCalled();
  });

  it("writes normalized values through updateByRuc", async () => {
    const leads = createLeadRepositoryDouble();

    await applySunatEnrichment({
      overlay: {
        documentType: "ruc",
        documentValue: "20123456789",
        legalName: "  Acme SAC  ",
        address: "  Av. Lima 123  ",
        district: "  Miraflores ",
        department: " Lima ",
      },
      leads,
      now: 999,
    });

    expect(leads.updateByRuc).toHaveBeenCalledWith("20123456789", {
      razonSocial: "Acme SAC",
      address: "Av. Lima 123",
      district: "Miraflores",
      department: "Lima",
      updatedAt: 999,
    });
  });

  it("uses Date.now when now is not provided", async () => {
    const leads = createLeadRepositoryDouble();
    vi.spyOn(Date, "now").mockReturnValue(456);

    await applySunatEnrichment({
      overlay: {
        documentType: "ruc",
        documentValue: "20123456789",
        legalName: "Acme SAC",
        address: null,
        district: null,
        department: null,
      },
      leads,
    });

    expect(leads.updateByRuc).toHaveBeenCalledWith("20123456789", {
      razonSocial: "Acme SAC",
      updatedAt: 456,
    });
  });
});
