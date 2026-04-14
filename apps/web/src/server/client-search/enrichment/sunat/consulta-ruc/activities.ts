import type { SunatEconomicActivity } from "../contracts";
import { sanitizeField } from "../text";

export function readEconomicActivities(
  value: string | null,
): SunatEconomicActivity[] {
  if (!value) return [];

  const matches = [
    ...value.matchAll(
      /(Principal|Secundaria\s+\d+)\s*-\s*([0-9]+)\s*-\s*([\s\S]*?)(?=\s*(?:Principal|Secundaria\s+\d+)\s*-\s*[0-9]+\s*-|$)/gi,
    ),
  ];

  return matches
    .map((match) => {
      const label = sanitizeField(match[1]);
      const code = sanitizeField(match[2]);
      const description = sanitizeField(match[3]);
      if (!label || !code || !description) return null;

      const secondaryMatch = /secundaria\s+(\d+)/i.exec(label);
      const order = secondaryMatch ? Number(secondaryMatch[1]) : null;

      return {
        role: label.toLowerCase() === "principal" ? "principal" : "secondary",
        order: Number.isFinite(order) ? order : null,
        label,
        code,
        description,
      } satisfies SunatEconomicActivity;
    })
    .filter((activity): activity is SunatEconomicActivity => activity !== null);
}
