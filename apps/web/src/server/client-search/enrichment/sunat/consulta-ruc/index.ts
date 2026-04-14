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
      return typeof value === "string" && value.trim().length > 0
        ? value
        : null;
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
    contributorStatus: sanitizeField(
      findByLabel(fields, "estado del contribuyente"),
    ),
    contributorCondition: sanitizeField(
      findByLabel(fields, "condicion del contribuyente"),
    ),
    economicActivities: readEconomicActivities(activitiesText),
    fields,
  };
}

export { readFields };
