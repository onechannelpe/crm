import type { SearchResult } from "~/actions/search/contracts";

export interface CompanyRef {
  ruc: string | null;
  name: string | null;
}

export interface PersonGroup {
  key: string;
  doc_type: string;
  doc_number: string;
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

export function groupByDocument(
  results: readonly SearchResult[],
): PersonGroup[] {
  const groups = new Map<string, SearchResult[]>();
  for (const row of results) {
    if (row.kind !== "document") continue;
    const key = `${row.doc.doc_type}:${row.doc.doc_number}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return [...groups.entries()].map(([key, rows]) => {
    const first = rows[0]!;
    const docType =
      first.kind === "document" ? first.doc.doc_type : "";
    const docNumber =
      first.kind === "document" ? first.doc.doc_number : "";

    const aliases: string[] = [];
    const aliasSet = new Set<string>();
    const phones: string[] = [];
    const phoneSet = new Set<string>();
    const companies: CompanyRef[] = [];
    const companyKeys = new Set<string>();

    for (const row of rows) {
      if (row.kind !== "document") continue;
      pushUnique(aliases, aliasSet, row.doc.name);
      pushUnique(phones, phoneSet, row.phones.primary);
      pushUnique(phones, phoneSet, row.phones.secondary);
      for (const siblingPhone of row.phones.siblings ?? []) {
        pushUnique(phones, phoneSet, siblingPhone);
      }

      const ck = companyKey(row.org?.ruc ?? null, row.org?.name ?? null);
      if (ck !== "|" && !companyKeys.has(ck)) {
        companyKeys.add(ck);
        companies.push({
          ruc: normalized(row.org?.ruc) || null,
          name: normalized(row.org?.name) || null,
        });
      }
    }

    const displayName =
      aliases.find((alias) => alias.length > 0) ?? docNumber;
    return { key, doc_type: docType, doc_number: docNumber, displayName, aliases, companies, phones };
  });
}

export function groupByCompany(
  results: readonly SearchResult[],
): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>();

  for (const [index, row] of results.entries()) {
    if (row.kind !== "company") continue;
    const ruc = normalized(row.company.ruc);
    const key = ruc ? `ruc:${ruc}` : `row:${index}`;
    const existing = groups.get(key);

    if (existing) {
      if (!existing.name) {
        existing.name = normalized(row.company.legal_name) || null;
      }

      const phoneSet = new Set(existing.phones);
      pushUnique(existing.phones, phoneSet, row.phones.primary);
      pushUnique(existing.phones, phoneSet, row.phones.secondary);
      for (const siblingPhone of row.phones.siblings ?? []) {
        pushUnique(existing.phones, phoneSet, siblingPhone);
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

    groups.set(key, {
      key,
      ruc: ruc || null,
      name: normalized(row.company.legal_name) || null,
      people: [],
      phones,
      emails: [],
    });
  }

  return [...groups.values()];
}
