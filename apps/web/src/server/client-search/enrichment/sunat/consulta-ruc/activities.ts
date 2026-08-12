import type { SunatEconomicActivity } from "../contracts";
import { sanitizeField } from "../text";

const ECONOMIC_ACTIVITY_PATTERN =
  /^(Principal|Secundaria\s+\d+)\s*-\s*([0-9]+)\s*-\s*(.*)$/i;

export function readEconomicActivities(
  value: string | null,
): SunatEconomicActivity[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => {
      const match = ECONOMIC_ACTIVITY_PATTERN.exec(line);
      if (!match) {
        return null;
      }

      const [, rawLabel, rawCode, rawDescription] = match;
      const label = sanitizeField(rawLabel);
      const code = sanitizeField(rawCode);
      const description = sanitizeField(rawDescription);

      if (!label || !code || !description) {
        return null;
      }

      const secondary = /secundaria\s+(\d+)/i.exec(label);

      return {
        role: secondary ? "secondary" : "principal",
        order: secondary ? Number(secondary[1]) : null,
        label,
        code,
        description,
      } satisfies SunatEconomicActivity;
    })
    .filter((activity): activity is SunatEconomicActivity => activity !== null);
}
