import type { LeadPatch } from "~/server/workflow/domain/lead-record";

import type { LeadRepository } from "../ports/lead-repository";

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

function toLeadPatchFromSunatOverlay(
  overlay: SunatLeadOverlay,
): Pick<LeadPatch, "razonSocial" | "address" | "district" | "department"> {
  const patch: Pick<
    LeadPatch,
    "razonSocial" | "address" | "district" | "department"
  > = {};

  const razonSocial = normalizeOverlayValue(overlay.legalName);
  if (razonSocial !== null) {
    patch.razonSocial = razonSocial;
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
  leads: LeadRepository;
  now?: number;
}): Promise<void> {
  if (input.overlay.documentType !== "ruc") {
    return;
  }

  const patch: LeadPatch = toLeadPatchFromSunatOverlay(input.overlay);
  if (Object.keys(patch).length < 1) {
    return;
  }

  await input.leads.updateByRuc(input.overlay.documentValue, {
    ...patch,
    updatedAt: input.now ?? Date.now(),
  });
}
