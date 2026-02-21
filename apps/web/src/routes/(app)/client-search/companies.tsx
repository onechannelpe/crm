import { A } from "@solidjs/router";
import { useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, Show, onMount } from "solid-js";

import Building2 from "~/components/icons/building-2";
import ChevronDown from "~/components/icons/chevron-down";
import Phone from "~/components/icons/phone";
import User from "~/components/icons/user";
import { AppPage } from "~/components/layout/page";
import { createClientSearchController } from "~/features/client-search/controller";
import { groupCompaniesByRuc } from "~/features/client-search/grouping";
import type { SearchType } from "~/server/shared/engine/types";

const COMPANY_SEARCH_TYPES = [
  "ruc",
  "company_name",
  "person_name",
  "dni",
  "phone",
  "phone_enriched",
] as const;

const SEARCH_LABELS: Partial<Record<SearchType, string>> = {
  ruc: "RUC",
  company_name: "Company name",
  person_name: "Person name",
  dni: "DNI",
  phone: "Phone",
  phone_enriched: "Phone (enriched)",
};

type CompanyTableRow = {
  id: string;
  name: string;
  ruc: string;
  contacts: string;
  contactDnis: string;
  phones: string;
  records: number;
  contactLinks: Array<{ name: string; dni: string | null }>;
};

function toInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function buildRows(
  grouped: ReturnType<typeof groupCompaniesByRuc>,
): CompanyTableRow[] {
  return grouped.map((company, index) => {
    const name = company.name ?? `Company ${index + 1}`;
    const contacts = company.people
      .map((person) => person.name || person.dni)
      .filter(Boolean);
    const contactDnis = company.people.map((person) => person.dni).filter(Boolean);

    return {
      id: `${company.key}-${index}`,
      name,
      ruc: company.ruc || "-",
      contacts: contacts.length > 0 ? contacts.join(" · ") : "-",
      contactDnis: contactDnis.length > 0 ? contactDnis.join(" · ") : "-",
      phones: company.phones.length > 0 ? company.phones.join(" · ") : "-",
      records: company.rows.length,
      contactLinks: company.people.map((person) => ({
        name: person.name || person.dni,
        dni: person.dni || null,
      })),
    };
  });
}

function inferCompanySearchType(query: string): SearchType {
  const value = query.trim();
  if (/^\d{11}$/.test(value)) return "ruc";
  if (/^\d{8}$/.test(value)) return "dni";
  if (/^[+\d()\s-]{6,}$/.test(value)) return "phone";
  if (value.includes(" ")) return "person_name";
  return "company_name";
}

export default function ClientSearchCompaniesPage() {
  const [searchParams] = useSearchParams();
  const [autoType, setAutoType] = createSignal(true);
  const controller = createClientSearchController({
    defaultType: "company_name",
    allowedTypes: COMPANY_SEARCH_TYPES,
    searchParams,
    errorFallback: "Search request failed",
  });

  const grouped = createMemo(() => groupCompaniesByRuc(controller.results()));
  const rows = createMemo(() => buildRows(grouped()));
  const uniqueRucCount = createMemo(
    () => new Set(rows().filter((row) => row.ruc !== "-").map((row) => row.ruc)).size,
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
              data-active="false"
            >
              People
            </A>
            <A
              href="/client-search/companies"
              class="tw-search-tab"
              data-active="true"
            >
              Companies
            </A>
          </div>
          <form
            class="tw-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (autoType()) {
                controller.setSearchType(inferCompanySearchType(controller.query()));
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
                  const allowedType = COMPANY_SEARCH_TYPES.find(
                    (type) => type === nextType,
                  );
                  if (!allowedType) return;
                  controller.setSearchType(allowedType);
                }}
                disabled={autoType()}
              >
                <For each={COMPANY_SEARCH_TYPES}>
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
                placeholder="Company, RUC, contact, DNI or phone"
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
            <span>All Companies</span>
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
                    <Building2 class="h-4 w-4" />
                    Company
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <Building2 class="h-4 w-4" />
                    RUC
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <User class="h-4 w-4" />
                    Contacts
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <User class="h-4 w-4" />
                    Contact DNIs
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <Phone class="h-4 w-4" />
                    Phones
                  </div>
                </th>
                <th>
                  <div class="inline-flex items-center gap-2">
                    <Building2 class="h-4 w-4" />
                    Records
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
                        <span class="tw-square-dot">
                          {toInitial(row.name)}
                        </span>
                        <span>{row.name}</span>
                      </span>
                    </td>
                    <td>
                      <span class="tw-pill">{row.ruc}</span>
                    </td>
                    <td>
                      <div class="flex flex-wrap gap-1">
                        <For each={row.contactLinks}>
                          {(person) => (
                            <A
                              href={`/client-search/people?type=${person.dni ? "dni" : "person_name"}&query=${encodeURIComponent(person.dni ?? person.name)}&limit=${encodeURIComponent(controller.limit())}`}
                              class="tw-pill"
                            >
                              {person.name}
                            </A>
                          )}
                        </For>
                        <Show when={row.contactLinks.length === 0}>
                          <span class="tw-pill">-</span>
                        </Show>
                      </div>
                    </td>
                    <td>
                      <span class="tw-pill">{row.contactDnis}</span>
                    </td>
                    <td>
                      <span class="tw-pill">{row.phones}</span>
                    </td>
                    <td>
                      <span class="tw-pill">{row.records}</span>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={rows().length === 0}>
                <tr>
                  <td colSpan={7} class="tw-table-empty">
                    Run a search by RUC, company, contact, DNI or phone to list
                    companies and jump to related people.
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
            Unique of RUC <span class="tw-footer-strong">{uniqueRucCount()}</span>
          </div>
          <div class="text-right">
            Company rows <span class="tw-footer-strong">{rows().length}</span>
          </div>
        </div>
      </section>
    </AppPage>
  );
}
