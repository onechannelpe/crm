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
import { cn } from "~/lib/utils";
import styles from "./search-page.module.css";

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
    <AppPage class={styles.page}>
      <section class={styles.panel}>
        <div class={styles.searchPanel}>
          <div class={styles.tabList}>
            <A
              href="/client-search/people"
              class={styles.tab}
            >
              People
            </A>
            <A
              href="/client-search/companies"
              class={cn(styles.tab, styles.tabActive)}
            >
              Companies
            </A>
          </div>
          <form
            class={styles.searchForm}
            onSubmit={(event) => {
              event.preventDefault();
              if (autoType()) {
                controller.setSearchType(inferCompanySearchType(controller.query()));
              }
              void controller.runCurrentSearch();
            }}
          >
            <label class={styles.searchField}>
              <span class={styles.searchLabel}>Type</span>
              <select
                class={styles.searchSelect}
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

            <label class={styles.searchField}>
              <span class={styles.searchLabel}>
                Value <span class={styles.requiredMark}>*</span>
              </span>
              <input
                class={styles.searchInput}
                placeholder="Company, RUC, contact, DNI or phone"
                value={controller.query()}
                onInput={(event) => controller.setQuery(event.currentTarget.value)}
                required
              />
            </label>

            <label class={styles.searchField}>
              <span class={styles.searchLabel}>
                Limit <span class={styles.requiredMark}>*</span>
              </span>
              <input
                class={styles.searchInput}
                type="number"
                min="1"
                max="100"
                value={controller.limit()}
                onInput={(event) => controller.setLimit(event.currentTarget.value)}
                required
              />
            </label>

            <div class={cn(styles.searchField, styles.alignEnd)}>
              <span class={cn(styles.searchLabel, styles.hiddenLabel)} aria-hidden="true">
                Search
              </span>
              <button
                type="submit"
                class={styles.searchButton}
                disabled={controller.searching()}
              >
                {controller.searching() ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          <div class={styles.searchControls}>
            <label class={styles.searchToggleLabel}>
              <input
                type="checkbox"
                class={styles.searchToggleInput}
                checked={autoType()}
                onInput={(event) => setAutoType(event.currentTarget.checked)}
              />
              Auto detect search type
            </label>
            <span class={styles.searchHelper}>
              Current type:{" "}
              {SEARCH_LABELS[controller.searchType()] ?? controller.searchType()}
            </span>
          </div>
        </div>

        <Show when={controller.error()}>
          {(message) => (
            <div class={styles.errorBar}>
              {message()}
            </div>
          )}
        </Show>

        <div class={styles.viewBar}>
          <div class={styles.viewPicker}>
            <span>All Companies</span>
            <span class={styles.muted}>· {rows().length}</span>
            <ChevronDown class={styles.pickerIcon} size={16} />
          </div>
          <div class={styles.viewActions}>
            <span class={styles.viewAction}>Filter</span>
            <span class={styles.viewAction}>Sort</span>
            <span class={styles.viewAction}>Options</span>
          </div>
        </div>

        <div class={styles.tableWrap}>
          <table class={styles.table}>
            <thead>
              <tr>
                <th class={cn(styles.tableHeadCell, styles.tableCheckboxCell)}>
                  <input type="checkbox" class={styles.checkbox} />
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <Building2 class={styles.headerIcon} size={16} />
                    Company
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <Building2 class={styles.headerIcon} size={16} />
                    RUC
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <User class={styles.headerIcon} size={16} />
                    Contacts
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <User class={styles.headerIcon} size={16} />
                    Contact DNIs
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <Phone class={styles.headerIcon} size={16} />
                    Phones
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <Building2 class={styles.headerIcon} size={16} />
                    Records
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={rows()}>
                {(row) => (
                  <tr>
                    <td class={cn(styles.tableCell, styles.tableCheckboxCell)}>
                      <input type="checkbox" class={styles.checkbox} />
                    </td>
                    <td class={styles.tableCell}>
                      <span class={styles.chip}>
                        <span class={styles.squareDot}>
                          {toInitial(row.name)}
                        </span>
                        <span>{row.name}</span>
                      </span>
                    </td>
                    <td class={styles.tableCell}>
                      <span class={styles.pill}>{row.ruc}</span>
                    </td>
                    <td class={styles.tableCell}>
                      <div class={styles.pillWrap}>
                        <For each={row.contactLinks}>
                          {(person) => (
                            <A
                              href={`/client-search/people?type=${person.dni ? "dni" : "person_name"}&query=${encodeURIComponent(person.dni ?? person.name)}&limit=${encodeURIComponent(controller.limit())}`}
                              class={styles.pill}
                            >
                              {person.name}
                            </A>
                          )}
                        </For>
                        <Show when={row.contactLinks.length === 0}>
                          <span class={styles.pill}>-</span>
                        </Show>
                      </div>
                    </td>
                    <td class={styles.tableCell}>
                      <span class={styles.pill}>{row.contactDnis}</span>
                    </td>
                    <td class={styles.tableCell}>
                      <span class={styles.pill}>{row.phones}</span>
                    </td>
                    <td class={styles.tableCell}>
                      <span class={styles.pill}>{row.records}</span>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={rows().length === 0}>
                <tr>
                  <td colSpan={7} class={cn(styles.tableCell, styles.tableEmpty)}>
                    Run a search by RUC, company, contact, DNI or phone to list
                    companies and jump to related people.
                  </td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>

        <div class={styles.addRow}>+ Add New</div>

        <div class={styles.footer}>
          <div class={styles.calcWrap}>
            <span>Calculate</span>
            <ChevronDown size={16} />
          </div>
          <div>
            Unique of RUC <span class={styles.footerStrong}>{uniqueRucCount()}</span>
          </div>
          <div class={styles.footerRight}>
            Company rows <span class={styles.footerStrong}>{rows().length}</span>
          </div>
        </div>
      </section>
    </AppPage>
  );
}
