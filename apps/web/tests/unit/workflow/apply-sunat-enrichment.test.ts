import { afterEach, describe, expect, it, vi } from "vitest";

import { applySunatEnrichment } from "~/server/workflow/application/commands/apply-sunat-enrichment";
import type { PartyRepository } from "~/server/workflow/infrastructure/ports/entities";

function createPartyRepositoryDouble() {
  const findOrganizationByRuc = vi.fn<PartyRepository["findOrganizationByRuc"]>(
    async () => ({
      id: "01974fd5-f261-7a7d-93f5-2f3d0f963010",
      ruc: "20123456789",
      legalName: "Acme",
      giroNegocio: null,
      address: null,
      district: null,
      province: null,
      department: null,
      phone: null,
      email: null,
    }),
  );
  const updateOrganizationFromEnrichment = vi.fn<
    PartyRepository["updateOrganizationFromEnrichment"]
  >(async () => {});

  const repo = {
    findOrganizationByRuc,
    updateOrganizationFromEnrichment,
    findOrganizationById: async () => undefined,
    createOrganization: async () => {
      throw new Error("not used in test");
    },
    updateOrganizationCommercial: async () => {},
    upsertPrimaryLegalRepresentative: async () => {},
    findPrimaryLegalRepresentative: async () => undefined,
  } satisfies PartyRepository;

  return { repo, findOrganizationByRuc, updateOrganizationFromEnrichment };
}

describe("applySunatEnrichment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores overlays for non-ruc documents", async () => {
    const { repo, updateOrganizationFromEnrichment } =
      createPartyRepositoryDouble();

    await applySunatEnrichment({
      overlay: {
        documentType: "dni",
        documentValue: "12345678",
        legalName: "Persona",
        address: "Calle 1",
        district: "Lima",
        department: "Lima",
      },
      party: repo,
    });

    expect(updateOrganizationFromEnrichment).not.toHaveBeenCalled();
  });

  it("skips writes when overlay has only empty values", async () => {
    const { repo, updateOrganizationFromEnrichment } =
      createPartyRepositoryDouble();

    await applySunatEnrichment({
      overlay: {
        documentType: "ruc",
        documentValue: "20123456789",
        legalName: "   ",
        address: null,
        district: "",
        department: " ",
      },
      party: repo,
    });

    expect(updateOrganizationFromEnrichment).not.toHaveBeenCalled();
  });

  it("writes normalized values through party repository", async () => {
    const { repo, updateOrganizationFromEnrichment } =
      createPartyRepositoryDouble();

    await applySunatEnrichment({
      overlay: {
        documentType: "ruc",
        documentValue: "20123456789",
        legalName: "  Acme SAC  ",
        address: "  Av. Lima 123  ",
        district: "  Miraflores ",
        department: " Lima ",
      },
      party: repo,
    });

    expect(updateOrganizationFromEnrichment).toHaveBeenCalledWith({
      organizationId: "01974fd5-f261-7a7d-93f5-2f3d0f963010",
      legalName: "Acme SAC",
      address: "Av. Lima 123",
      district: "Miraflores",
      department: "Lima",
    });
  });

  it("skips writes when organization does not exist", async () => {
    const { repo, findOrganizationByRuc, updateOrganizationFromEnrichment } =
      createPartyRepositoryDouble();
    findOrganizationByRuc.mockResolvedValueOnce(undefined);

    await applySunatEnrichment({
      overlay: {
        documentType: "ruc",
        documentValue: "20123456789",
        legalName: "Acme SAC",
        address: null,
        district: null,
        department: null,
      },
      party: repo,
    });

    expect(updateOrganizationFromEnrichment).not.toHaveBeenCalled();
  });
});
