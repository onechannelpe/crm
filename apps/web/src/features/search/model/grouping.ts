import type { SearchResult } from "~/actions/search/contracts";

export interface CompanyRef {
  ruc: string | null;
  name: string | null;
}

export interface PersonGroup {
  key: string;
  dni: string;
  displayName: string;
  aliases: string[];
  companies: CompanyRef[];
  phones: string[];
}

export interface CompanyGroup {
  key: string;
  ruc: string | null;
  name: string | null;
  people: Array<{ dni: string; name: string }>;
  phones: string[];
  emails: string[];
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
  if (!safe || seen.has(safe)) return;
  seen.add(safe);
  values.push(safe);
}

function companyKey(ruc: string | null, name: string | null): string {
  return `${normalized(ruc)}|${normalized(name)}`;
}

export function groupPeopleByDni(
  results: readonly SearchResult[],
): PersonGroup[] {
  const groups = new Map<string, SearchResult[]>();
  for (const row of results) {
    const dni = normalized(row.person.dni);
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
      pushUnique(aliases, aliasSet, row.person.name);
      pushUnique(phones, phoneSet, row.phones.primary);
      pushUnique(phones, phoneSet, row.phones.secondary);
      for (const siblingPhone of row.phones.siblings ?? []) {
        pushUnique(phones, phoneSet, siblingPhone);
      }

      const key = companyKey(row.org?.ruc ?? null, row.org?.name ?? null);
      if (key !== "|" && !companyKeys.has(key)) {
        companyKeys.add(key);
        companies.push({
          ruc: normalized(row.org?.ruc) || null,
          name: normalized(row.org?.name) || null,
        });
      }
    }

    const displayName = aliases.find((alias) => alias.length > 0) ?? dni;
    return { key: dni, dni, displayName, aliases, companies, phones };
  });
}

export function groupCompaniesByRuc(
  results: readonly SearchResult[],
): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>();

  for (const [index, row] of results.entries()) {
    const ruc = normalized(row.org?.ruc ?? null);
    const key = ruc ? `ruc:${ruc}` : `row:${index}`;
    const existing = groups.get(key);

    if (existing) {
      if (!existing.name) {
        existing.name = normalized(row.org?.name ?? null) || null;
      }

      const phoneSet = new Set(existing.phones);
      pushUnique(existing.phones, phoneSet, row.phones.primary);
      pushUnique(existing.phones, phoneSet, row.phones.secondary);
      for (const siblingPhone of row.phones.siblings ?? []) {
        pushUnique(existing.phones, phoneSet, siblingPhone);
      }

      const emailSet = new Set(existing.emails);
      pushUnique(existing.emails, emailSet, row.person.email);

      const personDni = normalized(row.person.dni);
      const personName = normalized(row.person.name);
      const existingPeople = new Set(
        existing.people.map((person) => person.dni),
      );
      if (personDni && !existingPeople.has(personDni)) {
        existing.people.push({ dni: personDni, name: personName || personDni });
      }
      continue;
    }

    const phones: string[] = [];
    const phoneSet = new Set<string>();
    pushUnique(phones, phoneSet, row.phones.primary);
    pushUnique(phones, phoneSet, row.phones.secondary);
    for (const siblingPhone of row.phones.siblings ?? []) {
      pushUnique(phones, phoneSet, siblingPhone);
    }

    const emails: string[] = [];
    const emailSet = new Set<string>();
    pushUnique(emails, emailSet, row.person.email);

    const personDni = normalized(row.person.dni);
    groups.set(key, {
      key,
      ruc: ruc || null,
      name: normalized(row.org?.name ?? null) || null,
      people: personDni
        ? [{ dni: personDni, name: normalized(row.person.name) || personDni }]
        : [],
      phones,
      emails,
    });
  }

  return [...groups.values()];
}
