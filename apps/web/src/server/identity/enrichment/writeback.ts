import type { PartyRepository } from "~/server/workflow/ports";

export type SunatLeadOverlay = {
  documentType: "dni" | "ruc";
  documentValue: string;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
};

function normalizeOverlayValue(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toOrganizationPatchFromSunatOverlay(overlay: SunatLeadOverlay): {
  legalName?: string;
  address?: string;
  district?: string;
  department?: string;
} {
  const patch: {
    legalName?: string;
    address?: string;
    district?: string;
    department?: string;
  } = {};

  const legalName = normalizeOverlayValue(overlay.legalName);
  if (legalName !== null) {
    patch.legalName = legalName;
  }

  const address = normalizeOverlayValue(overlay.address);
  if (address !== null) {
    patch.address = address;
  }

  const district = normalizeOverlayValue(overlay.district);
  if (district !== null) {
    patch.district = district;
  }

  const department = normalizeOverlayValue(overlay.department);
  if (department !== null) {
    patch.department = department;
  }

  return patch;
}

export async function applySunatEnrichment(input: {
  overlay: SunatLeadOverlay;
  party: PartyRepository;
}): Promise<void> {
  if (input.overlay.documentType !== "ruc") {
    return;
  }

  const patch = toOrganizationPatchFromSunatOverlay(input.overlay);
  if (Object.keys(patch).length < 1) {
    return;
  }

  const organization = await input.party.findOrganizationByRuc(
    input.overlay.documentValue,
  );
  if (!organization) return;

  await input.party.updateOrganizationFromEnrichment({
    organizationId: organization.id,
    ...patch,
  });
}
