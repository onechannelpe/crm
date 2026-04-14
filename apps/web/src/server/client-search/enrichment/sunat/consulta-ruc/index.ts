import type { SunatEconomicActivity } from "../contracts";
import { normalizeLabel, sanitizeField } from "../text";
import { readEconomicActivities } from "./activities";
import { readFields } from "./fields";

export type ConsultaRucSnapshot = {
  contributorStatus: string | null;
  contributorCondition: string | null;
  economicActivities: SunatEconomicActivity[];
  fields: Record<string, string>;
};

function findByLabel(
  fields: Record<string, string>,
  candidateLabel: string,
): string | null {
  const normalizedCandidate = normalizeLabel(candidateLabel);

  for (const [label, value] of Object.entries(fields)) {
    if (normalizeLabel(label) === normalizedCandidate) {
      return sanitizeField(value) ?? null;
    }
  }

  return null;
}

export function readSnapshot(html: string): ConsultaRucSnapshot {
  const fields = readFields(html);
  const activitiesText =
    findByLabel(fields, "actividad(es) economica(s)") ??
    findByLabel(fields, "actividad economica");

  return {
    contributorStatus: findByLabel(fields, "estado del contribuyente"),
    contributorCondition: findByLabel(fields, "condicion del contribuyente"),
    economicActivities: readEconomicActivities(activitiesText),
    fields,
  };
}

export { readFields };
