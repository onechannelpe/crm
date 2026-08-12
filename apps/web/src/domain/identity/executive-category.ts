export type ExecutiveCategory = "elite" | "corporativa";

export function isExecutiveCategory(value: string): value is ExecutiveCategory {
  return value === "elite" || value === "corporativa";
}
