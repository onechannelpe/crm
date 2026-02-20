import type { SearchResult } from "~/server/shared/engine/types";

export interface CompanyRef {
  ruc: string | null;
  name: string | null;
}

export interface PersonGroup {
  dni: string;
  displayName: string;
  aliases: string[];
  companies: CompanyRef[];
  phones: string[];
  rows: SearchResult[];
}

export interface CompanyGroup {
  key: string;
  ruc: string | null;
  name: string | null;
  people: Array<{ dni: string; name: string }>;
  phones: string[];
  rows: SearchResult[];
}

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function pushUnique(
  values: string[],
  seen: Set<string>,
  value: string | null | undefined,
): void {
  const safe = normalized(value);
  if (!safe) return;
  if (seen.has(safe)) return;
  seen.add(safe);
  values.push(safe);
}

function firstNonEmpty(values: readonly string[]): string {
  return values.find((value) => value.trim().length > 0) ?? "";
}

function companyKey(ruc: string | null, name: string | null): string {
  const safeRuc = normalized(ruc);
  const safeName = normalized(name);
  return `${safeRuc}|${safeName}`;
}

export function groupPeopleByDni(
  results: readonly SearchResult[],
): PersonGroup[] {
  const groups = new Map<string, SearchResult[]>();
  for (const row of results) {
    const dni = normalized(row.dni);
    if (!dni) continue;
    const existing = groups.get(dni);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(dni, [row]);
    }
  }

  return [...groups.entries()].map(([dni, rows]) => {
    const aliases: string[] = [];
    const aliasSet = new Set<string>();
    const phones: string[] = [];
    const phoneSet = new Set<string>();
    const companies: CompanyRef[] = [];
    const companyKeys = new Set<string>();

    for (const row of rows) {
      pushUnique(aliases, aliasSet, row.name);
      pushUnique(phones, phoneSet, row.phone_primary);
      pushUnique(phones, phoneSet, row.phone_secondary);
      for (const siblingPhone of row.sibling_phones ?? []) {
        pushUnique(phones, phoneSet, siblingPhone);
      }

      const key = companyKey(row.org_ruc, row.org_name);
      if (key !== "|" && !companyKeys.has(key)) {
        companyKeys.add(key);
        companies.push({
          ruc: normalized(row.org_ruc) || null,
          name: normalized(row.org_name) || null,
        });
      }
    }

    return {
      dni,
      displayName: firstNonEmpty(aliases),
      aliases,
      companies,
      phones,
      rows,
    };
  });
}

function mergeCompanyName(
  base: string | null,
  next: string | null,
): string | null {
  if (base) return base;
  return next;
}

export function groupCompaniesByRuc(
  results: readonly SearchResult[],
): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>();
  for (const [index, row] of results.entries()) {
    const ruc = normalized(row.org_ruc);
    const key = ruc ? `ruc:${ruc}` : `row:${index}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      existing.name = mergeCompanyName(
        existing.name,
        normalized(row.org_name) || null,
      );
      const phoneSet = new Set(existing.phones);
      pushUnique(existing.phones, phoneSet, row.phone_primary);
      pushUnique(existing.phones, phoneSet, row.phone_secondary);
      for (const siblingPhone of row.sibling_phones ?? []) {
        pushUnique(existing.phones, phoneSet, siblingPhone);
      }
      const personDni = normalized(row.dni);
      const personName = normalized(row.name);
      const peopleDniSet = new Set(existing.people.map((person) => person.dni));
      if (personDni && !peopleDniSet.has(personDni)) {
        existing.people.push({
          dni: personDni,
          name: personName,
        });
      }
      continue;
    }

    const phoneSet = new Set<string>();
    const phones: string[] = [];
    pushUnique(phones, phoneSet, row.phone_primary);
    pushUnique(phones, phoneSet, row.phone_secondary);
    for (const siblingPhone of row.sibling_phones ?? []) {
      pushUnique(phones, phoneSet, siblingPhone);
    }

    const personDni = normalized(row.dni);
    const company: CompanyGroup = {
      key,
      ruc: ruc || null,
      name: normalized(row.org_name) || null,
      people: personDni ? [{ dni: personDni, name: normalized(row.name) }] : [],
      phones,
      rows: [row],
    };
    groups.set(key, company);
  }

  return [...groups.values()];
}
