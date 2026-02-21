import { A, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, Show, onMount } from "solid-js";

import Building2 from "~/components/icons/building-2";
import ChevronDown from "~/components/icons/chevron-down";
import Phone from "~/components/icons/phone";
import User from "~/components/icons/user";
import { AppPage } from "~/components/layout/page";
import { createClientSearchController } from "~/features/client-search/controller";
import { groupPeopleByDni } from "~/features/client-search/grouping";
import type { SearchType } from "~/server/shared/engine/types";

const PEOPLE_SEARCH_TYPES = [
  "dni",
  "person_name",
  "company_name",
  "ruc",
  "phone",
  "phone_enriched",
] as const;

const SEARCH_LABELS: Partial<Record<SearchType, string>> = {
  dni: "DNI",
  person_name: "Person name",
  company_name: "Company name",
  ruc: "RUC",
  phone: "Phone",
  phone_enriched: "Phone (enriched)",
};

type PersonTableRow = {
  id: string;
  name: string;
  dni: string;
  aliases: string;
  companies: string;
  rucs: string;
  phones: string;
  companyLinks: Array<{ name: string; ruc: string | null }>;
};

function toInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function buildRows(
  grouped: ReturnType<typeof groupPeopleByDni>,
): PersonTableRow[] {
  return grouped.map((person, index) => {
    const aliases = person.aliases.filter((alias) => alias !== person.displayName);
    const companies = person.companies
      .map((company) => company.name?.trim() || "")
      .filter(Boolean);
    const rucs = person.companies
      .map((company) => company.ruc?.trim() || "")
      .filter(Boolean);

    return {
      id: `${person.dni}-${index}`,
      name: person.displayName || `Person ${person.dni}`,
      dni: person.dni,
      aliases: aliases.length > 0 ? aliases.join(" · ") : "-",
      companies: companies.length > 0 ? companies.join(" · ") : "-",
      rucs: rucs.length > 0 ? rucs.join(" · ") : "-",
      phones: person.phones.length > 0 ? person.phones.join(" · ") : "-",
      companyLinks: person.companies
        .filter((company) => company.name?.trim() || company.ruc?.trim())
        .map((company) => ({
          name: company.name?.trim() || company.ruc?.trim() || "Company",
          ruc: company.ruc?.trim() || null,
        })),
    };
  });
}

function inferPeopleSearchType(query: string): SearchType {
  const value = query.trim();
  if (/^\d{8}$/.test(value)) return "dni";
  if (/^\d{11}$/.test(value)) return "ruc";
  if (/^[+\d()\s-]{6,}$/.test(value)) return "phone";
  if (/\b(inc|llc|ltd|corp|company|sac|sa)\b/i.test(value)) {
    return "company_name";
  }
  return "person_name";
}

export default function ClientSearchPeoplePage() {
  const [searchParams] = useSearchParams();
  const [autoType, setAutoType] = createSignal(true);
  const controller = createClientSearchController({
    defaultType: "person_name",
    allowedTypes: PEOPLE_SEARCH_TYPES,
    searchParams,
    errorFallback: "Search request failed",
  });

  const grouped = createMemo(() => groupPeopleByDni(controller.results()));
  const rows = createMemo(() => buildRows(grouped()));
  const uniqueDniCount = createMemo(
    () => new Set(rows().map((row) => row.dni)).size,
  );

  onMount(() => {
    void controller.initializeFromParams();
  });

  return (
    <AppPage class="space-y-0 pb-0">
      <section class="tw-record-index-panel">
        <div class="tw-search-panel">
          <div class="tw-search-tab-list">
            <A
              href="/client-search/people"
              class="tw-search-tab"
              data-active="true"
            >
              People
            </A>
            <A
              href="/client-search/companies"
              class="tw-search-tab"
              data-active="false"
            >
              Companies
            </A>
          </div>
          <form
            class="tw-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (autoType()) {
                controller.setSearchType(inferPeopleSearchType(controller.query()));
              }
              void controller.runCurrentSearch();
            }}
          >
            <label class="tw-search-field">
              <span class="tw-search-label">Type</span>
              <select
                class="tw-search-select"
                value={controller.searchType()}
                onInput={(event) => {
                  const nextType = event.currentTarget.value;
                  const allowedType = PEOPLE_SEARCH_TYPES.find(
                    (type) => type === nextType,
                  );
                  if (!allowedType) return;
                  controller.setSearchType(allowedType);
                }}
                disabled={autoType()}
              >
                <For each={PEOPLE_SEARCH_TYPES}>
                  {(type) => (
                    <option value={type}>{SEARCH_LABELS[type] ?? type}</option>
                  )}
                </For>
              </select>
            </label>

            <label class="tw-search-field">
              <span class="tw-search-label">
                Value <span class="text-foreground">*</span>
              </span>
              <input
                class="tw-search-input"
                placeholder="Name, DNI, company, RUC or phone"
                value={controller.query()}
                onInput={(event) => controller.setQuery(event.currentTarget.value)}
                required
              />
            </label>

            <label class="tw-search-field">
              <span class="tw-search-label">
                Limit <span class="text-foreground">*</span>
              </span>
              <input
                class="tw-search-input"
                type="number"
                min="1"
                max="100"
                value={controller.limit()}
                onInput={(event) => controller.setLimit(event.currentTarget.value)}
                required
              />
            </label>

            <div class="tw-search-field justify-end">
              <span class="tw-search-label opacity-0" aria-hidden="true">
                Search
              </span>
              <button
                type="submit"
                class="h-8 rounded-sm border border-primary bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-colors hover:brightness-95 disabled:opacity-50"
                disabled={controller.searching()}
              >
                {controller.searching() ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          <div class="tw-search-controls">
            <label class="inline-flex items-center gap-2 text-[13px] font-medium text-foreground">
              <input
                type="checkbox"
                class="h-4 w-4 rounded-[2px] border border-input"
                checked={autoType()}
                onInput={(event) => setAutoType(event.currentTarget.checked)}
              />
              Auto detect search type
            </label>
            <span class="tw-search-helper">
              Current type:{" "}
              {SEARCH_LABELS[controller.searchType()] ?? controller.searchType()}
            </span>
          </div>
        </div>

        <Show when={controller.error()}>
          {(message) => (
            <div class="border-b border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {message()}
            </div>
          )}
        </Show>

        <div class="tw-view-bar">
          <div class="tw-view-picker">
            <span>All People</span>
            <span class="text-muted-foreground">· {rows().length}</span>
            <ChevronDown class="h-4 w-4 text-muted-foreground" />
          </div>
          <div class="tw-view-actions">
            <span>Filter</span>
            <span>Sort</span>
            <span>Options</span>
          </div>
        </div>

        <div class="tw-record-table-scroll">
          <table class="tw-record-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" class="h-4 w-4 rounded-sm border-border" />
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <User class="h-4 w-4" />
                    Name
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <User class="h-4 w-4" />
                    DNI
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <Building2 class="h-4 w-4" />
                    Aliases
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <Building2 class="h-4 w-4" />
                    Companies
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <Building2 class="h-4 w-4" />
                    RUCs
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <Phone class="h-4 w-4" />
                    Phones
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={rows()}>
                {(row) => (
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded-sm border-border"
                      />
                    </td>
                    <td>
                      <span class="tw-chip">
                        <span class="tw-avatar-dot">
                          {toInitial(row.name)}
                        </span>
                        <span>{row.name}</span>
                      </span>
                    </td>
                    <td>
                      <span class="tw-pill">{row.dni}</span>
                    </td>
                    <td>
                      <span class="tw-pill">{row.aliases}</span>
                    </td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <For each={row.companyLinks}>
                          {(company) => (
                            <A
                              href={`/client-search/companies?type=${company.ruc ? "ruc" : "company_name"}&query=${encodeURIComponent(company.ruc ?? company.name)}&limit=${encodeURIComponent(controller.limit())}`}
                              class="tw-pill"
                            >
                              {company.name}
                            </A>
                          )}
                        </For>
                        <Show when={row.companyLinks.length === 0}>
                          <span class="tw-pill">-</span>
                        </Show>
                      </div>
                    </td>
                    <td>
                      <span class="tw-pill">{row.rucs}</span>
                    </td>
                    <td>
                      <span class="tw-pill">{row.phones}</span>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={rows().length === 0}>
                <tr>
                  <td colSpan={7} class="tw-table-empty">
                    Run a search by DNI, name, company, RUC or phone to list people
                    and follow linked companies.
                  </td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>

        <div class="tw-table-add-row">+ Add New</div>

        <div class="tw-table-footer">
          <div class="inline-flex items-center gap-2">
            <span>Calculate</span>
            <ChevronDown class="h-4 w-4" />
          </div>
          <div>
            Unique of DNI <span class="tw-footer-strong">{uniqueDniCount()}</span>
          </div>
          <div class="text-right">
            People rows <span class="tw-footer-strong">{rows().length}</span>
          </div>
        </div>
      </section>
    </AppPage>
  );
}
