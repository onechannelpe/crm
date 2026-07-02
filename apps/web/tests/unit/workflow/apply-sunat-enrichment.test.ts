import { afterEach, describe, expect, it, vi } from "vitest";

import { createOrganizationEnrichmentProjection } from "~/server/organization/apply-enrichment";
import type { OrganizationRepository } from "~/server/organization/organization-repo";

type ApplyEnrichment = OrganizationRepository["applyEnrichment"];

function createOrganizationRepositoryDouble() {
  const applyEnrichment = vi.fn<ApplyEnrichment>(async () => {});

  // Only applyEnrichment is exercised by the projection. Cast to satisfy the
  // full OrganizationRepository shape for typecheck; the other methods are never
  // called by the projection under test.
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  const repo = {
    applyEnrichment,
  } as unknown as OrganizationRepository;

  return { repo, applyEnrichment };
}

describe("createOrganizationEnrichmentProjection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips writes when every value normalizes to null", async () => {
    const { repo, applyEnrichment } = createOrganizationRepositoryDouble();

    await createOrganizationEnrichmentProjection(repo)({
      ruc: "20123456789",
      legalName: "   ",
      address: null,
      district: "",
      department: " ",
    });

    expect(applyEnrichment).not.toHaveBeenCalled();
  });

  it("writes normalized values through the organization repository", async () => {
    const { repo, applyEnrichment } = createOrganizationRepositoryDouble();

    await createOrganizationEnrichmentProjection(repo)({
      ruc: "20123456789",
      legalName: "  Acme SAC  ",
      address: "  Av. Lima 123  ",
      district: "  Miraflores ",
      department: " Lima ",
    });

    expect(applyEnrichment).toHaveBeenCalledWith({
      ruc: "20123456789",
      legalName: "Acme SAC",
      address: "Av. Lima 123",
      district: "Miraflores",
      department: "Lima",
    });
  });

  it("only writes fields that normalize to a non-empty value", async () => {
    const { repo, applyEnrichment } = createOrganizationRepositoryDouble();

    await createOrganizationEnrichmentProjection(repo)({
      ruc: "20123456789",
      legalName: "Acme SAC",
      address: "  ",
      district: null,
      department: "Lima",
    });

    expect(applyEnrichment).toHaveBeenCalledWith({
      ruc: "20123456789",
      legalName: "Acme SAC",
      department: "Lima",
    });
  });
});
