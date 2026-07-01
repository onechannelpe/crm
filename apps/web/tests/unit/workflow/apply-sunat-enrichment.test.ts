import { afterEach, describe, expect, it, vi } from "vitest";

import { createOrganizationEnrichmentProjection } from "~/server/identity/organization/apply-enrichment";
import type { PartyRepository } from "~/server/identity/organization/repo";
import { asOrganizationId } from "~/server/shared/ids";

function createPartyRepositoryDouble() {
  const findOrganizationByRuc = vi.fn<PartyRepository["findOrganizationByRuc"]>(
    async () => ({
      id: asOrganizationId("01974fd5-f261-7a7d-93f5-2f3d0f963010"),
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

describe("createOrganizationEnrichmentProjection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips writes when every value normalizes to null", async () => {
    const { repo, updateOrganizationFromEnrichment } =
      createPartyRepositoryDouble();

    await createOrganizationEnrichmentProjection(repo)({
      ruc: "20123456789",
      legalName: "   ",
      address: null,
      district: "",
      department: " ",
    });

    expect(updateOrganizationFromEnrichment).not.toHaveBeenCalled();
  });

  it("writes normalized values through party repository", async () => {
    const { repo, updateOrganizationFromEnrichment } =
      createPartyRepositoryDouble();

    await createOrganizationEnrichmentProjection(repo)({
      ruc: "20123456789",
      legalName: "  Acme SAC  ",
      address: "  Av. Lima 123  ",
      district: "  Miraflores ",
      department: " Lima ",
    });

    expect(updateOrganizationFromEnrichment).toHaveBeenCalledWith({
      organizationId: asOrganizationId("01974fd5-f261-7a7d-93f5-2f3d0f963010"),
      legalName: "Acme SAC",
      address: "Av. Lima 123",
      district: "Miraflores",
      department: "Lima",
    });
  });

  it("skips writes when organization does not exist for the ruc", async () => {
    const { repo, findOrganizationByRuc, updateOrganizationFromEnrichment } =
      createPartyRepositoryDouble();
    findOrganizationByRuc.mockResolvedValueOnce(undefined);

    await createOrganizationEnrichmentProjection(repo)({
      ruc: "20123456789",
      legalName: "Acme SAC",
      address: null,
      district: null,
      department: null,
    });

    expect(updateOrganizationFromEnrichment).not.toHaveBeenCalled();
  });

  it("only writes fields that normalize to a non-empty value", async () => {
    const { repo, updateOrganizationFromEnrichment } =
      createPartyRepositoryDouble();

    await createOrganizationEnrichmentProjection(repo)({
      ruc: "20123456789",
      legalName: "Acme SAC",
      address: "  ",
      district: null,
      department: "Lima",
    });

    expect(updateOrganizationFromEnrichment).toHaveBeenCalledWith({
      organizationId: asOrganizationId("01974fd5-f261-7a7d-93f5-2f3d0f963010"),
      legalName: "Acme SAC",
      department: "Lima",
    });
  });
});
