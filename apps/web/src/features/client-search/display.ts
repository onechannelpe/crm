import type { SearchType } from "~/server/shared/engine/types";

export const SEARCH_LABELS: Partial<Record<SearchType, string>> = {
  dni: "DNI",
  person_name: "Person name",
  company_name: "Company name",
  ruc: "RUC",
  phone: "Phone",
  phone_enriched: "Phone (enriched)",
};

export function toInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export function inferPeopleSearchType(query: string): SearchType {
  const value = query.trim();
  if (/^\d{8}$/.test(value)) return "dni";
  if (/^\d{11}$/.test(value)) return "ruc";
  if (/^[+\d()\s-]{6,}$/.test(value)) return "phone";
  if (/\b(inc|llc|ltd|corp|company|sac|sa)\b/i.test(value)) {
    return "company_name";
  }
  return "person_name";
}

export function inferCompanySearchType(query: string): SearchType {
  const value = query.trim();
  if (/^\d{11}$/.test(value)) return "ruc";
  if (/^\d{8}$/.test(value)) return "dni";
  if (/^[+\d()\s-]{6,}$/.test(value)) return "phone";
  if (value.includes(" ")) return "person_name";
  return "company_name";
}
