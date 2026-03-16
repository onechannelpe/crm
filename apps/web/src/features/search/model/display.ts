import type { SearchType } from "~/server/shared/pipeline-types";

export type SearchTab = "people" | "companies";

export function inferSearchType(query: string, tab: SearchTab): SearchType {
  const value = query.trim();

  if (/^\d{8}$/.test(value)) return "dni";
  if (/^\d{11}$/.test(value)) return "ruc";
  if (/^[+\d()\s-]{6,}$/.test(value)) return "phone";

  if (tab === "companies") return "company_name";
  return "person_name";
}
