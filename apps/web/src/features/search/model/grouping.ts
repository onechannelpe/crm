import type { SearchResult } from "~/server/shared/engine/types";

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
  id: number;
  key: string;
  ruc: string | null;
  name: string | null;
  phones: string[];
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

function companyGroupKey(
  row: Extract<SearchResult, { kind: "company" }>,
): string {
  return `company:${row.company.id}`;
}

export function groupByDocument(
  results: readonly SearchResult[],
): PersonGroup[] {
  const groups = new Map<
    string,
    Extract<SearchResult, { kind: "document" }>[]
  >();
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

  const out: PersonGroup[] = [];
  for (const [key, rows] of groups.entries()) {
    const first = rows[0];
    if (!first) continue;
    const docType = first.doc.doc_type;
    const docNumber = first.doc.doc_number;

    const aliases: string[] = [];
    const aliasSet = new Set<string>();
    const phones: string[] = [];
    const phoneSet = new Set<string>();
    const companies: CompanyRef[] = [];
    const companyKeys = new Set<string>();

    for (const row of rows) {
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

    const displayName = aliases.find((alias) => alias.length > 0) ?? docNumber;
    out.push({
      key,
      doc_type: docType,
      doc_number: docNumber,
      displayName,
      aliases,
      companies,
      phones,
    });
  }
  return out;
}

export function groupByCompany(
  results: readonly SearchResult[],
): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>();

  for (const row of results) {
    if (row.kind !== "company") continue;
    const key = companyGroupKey(row);
    const ruc = normalized(row.company.ruc);
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
      id: row.company.id,
      key,
      ruc: ruc || null,
      name: normalized(row.company.legal_name) || null,
      phones,
    });
  }

  return [...groups.values()];
}
