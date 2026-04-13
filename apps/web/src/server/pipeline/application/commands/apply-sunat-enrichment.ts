import type { LeadPatch } from "~/server/pipeline/domain/lead-record";

import type { LeadRepository } from "../ports/lead-repository";

export type SunatLeadOverlay = {
  documentType: "dni" | "ruc";
  documentValue: string;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
};

export async function applySunatEnrichment(input: {
  overlay: SunatLeadOverlay;
  leads: LeadRepository;
  now?: number;
}): Promise<void> {
  if (input.overlay.documentType !== "ruc") {
    return;
  }

  const lead = await input.leads.findByRuc(input.overlay.documentValue);
  if (!lead) {
    return;
  }

  const patch: LeadPatch = {};
  if (input.overlay.legalName) {
    patch.razonSocial = input.overlay.legalName;
  }
  if (input.overlay.address) {
    patch.address = input.overlay.address;
  }
  if (input.overlay.district) {
    patch.district = input.overlay.district;
  }
  if (input.overlay.department) {
    patch.department = input.overlay.department;
  }
  if (Object.keys(patch).length < 1) {
    return;
  }

  await input.leads.updateById(lead.id, {
    ...patch,
    updatedAt: input.now ?? Date.now(),
  });
}
