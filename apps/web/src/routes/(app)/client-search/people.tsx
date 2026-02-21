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
import { cn } from "~/lib/utils";
import styles from "./search-page.module.css";

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
    <AppPage class={styles.page}>
      <section class={styles.panel}>
        <div class={styles.searchPanel}>
          <div class={styles.tabList}>
            <A
              href="/client-search/people"
              class={cn(styles.tab, styles.tabActive)}
            >
              People
            </A>
            <A
              href="/client-search/companies"
              class={styles.tab}
            >
              Companies
            </A>
          </div>
          <form
            class={styles.searchForm}
            onSubmit={(event) => {
              event.preventDefault();
              if (autoType()) {
                controller.setSearchType(inferPeopleSearchType(controller.query()));
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

            <label class={styles.searchField}>
              <span class={styles.searchLabel}>
                Value <span class={styles.requiredMark}>*</span>
              </span>
              <input
                class={styles.searchInput}
                placeholder="Name, DNI, company, RUC or phone"
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
            <span>All People</span>
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
                    <User class={styles.headerIcon} size={16} />
                    Name
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <User class={styles.headerIcon} size={16} />
                    DNI
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <Building2 class={styles.headerIcon} size={16} />
                    Aliases
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <Building2 class={styles.headerIcon} size={16} />
                    Companies
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <Building2 class={styles.headerIcon} size={16} />
                    RUCs
                  </div>
                </th>
                <th class={styles.tableHeadCell}>
                  <div class={styles.tableLabel}>
                    <Phone class={styles.headerIcon} size={16} />
                    Phones
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
                        <span class={styles.avatarDot}>
                          {toInitial(row.name)}
                        </span>
                        <span>{row.name}</span>
                      </span>
                    </td>
                    <td class={styles.tableCell}>
                      <span class={styles.pill}>{row.dni}</span>
                    </td>
                    <td class={styles.tableCell}>
                      <span class={styles.pill}>{row.aliases}</span>
                    </td>
                    <td class={styles.tableCell}>
                      <div class={styles.pillWrap}>
                        <For each={row.companyLinks}>
                          {(company) => (
                            <A
                              href={`/client-search/companies?type=${company.ruc ? "ruc" : "company_name"}&query=${encodeURIComponent(company.ruc ?? company.name)}&limit=${encodeURIComponent(controller.limit())}`}
                              class={styles.pill}
                            >
                              {company.name}
                            </A>
                          )}
                        </For>
                        <Show when={row.companyLinks.length === 0}>
                          <span class={styles.pill}>-</span>
                        </Show>
                      </div>
                    </td>
                    <td class={styles.tableCell}>
                      <span class={styles.pill}>{row.rucs}</span>
                    </td>
                    <td class={styles.tableCell}>
                      <span class={styles.pill}>{row.phones}</span>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={rows().length === 0}>
                <tr>
                  <td colSpan={7} class={cn(styles.tableCell, styles.tableEmpty)}>
                    Run a search by DNI, name, company, RUC or phone to list people
                    and follow linked companies.
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
            Unique of DNI <span class={styles.footerStrong}>{uniqueDniCount()}</span>
          </div>
          <div class={styles.footerRight}>
            People rows <span class={styles.footerStrong}>{rows().length}</span>
          </div>
        </div>
      </section>
    </AppPage>
  );
}
