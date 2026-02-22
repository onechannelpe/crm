import { A, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Phone from "~/components/icons/phone";
import User from "~/components/icons/user";
import { AppPage } from "~/components/layout/page";
import { createClientSearchController } from "~/features/client-search/controller";
import {
  inferPeopleSearchType,
  SEARCH_LABELS,
  toInitial,
} from "~/features/client-search/display";
import { groupPeopleByDni } from "~/features/client-search/grouping";
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

function buildRows(
  grouped: ReturnType<typeof groupPeopleByDni>,
): PersonTableRow[] {
  return grouped.map((person, index) => {
    const aliases = person.aliases.filter(
      (alias) => alias !== person.displayName,
    );
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

export default function ClientSearchPeoplePage() {
  const [searchParams] = useSearchParams();
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  const [selectedRows, setSelectedRows] = createSignal<Set<string>>(new Set());
  const [filterHasPhone, setFilterHasPhone] = createSignal(false);
  const [sortBy, setSortBy] = createSignal<"name" | "companies">("name");
  const [showFilterMenu, setShowFilterMenu] = createSignal(false);
  const [showSortMenu, setShowSortMenu] = createSignal(false);

  const controller = createClientSearchController({
    defaultType: "person_name",
    allowedTypes: PEOPLE_SEARCH_TYPES,
    searchParams,
    errorFallback: "Search request failed",
  });

  const grouped = createMemo(() => groupPeopleByDni(controller.results()));
  const rows = createMemo(() => buildRows(grouped()));

  const filteredRows = createMemo(() => {
    let result = rows();
    if (filterHasPhone()) {
      result = result.filter((row) => row.phones !== "-");
    }
    return result;
  });

  const sortedRows = createMemo(() => {
    const result = [...filteredRows()];
    const sort = sortBy();
    if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "companies") {
      result.sort((a, b) => {
        const aCount =
          a.companies === "-" ? 0 : a.companies.split(" · ").length;
        const bCount =
          b.companies === "-" ? 0 : b.companies.split(" · ").length;
        return bCount - aCount;
      });
    }
    return result;
  });

  const uniqueDniCount = createMemo(
    () => new Set(sortedRows().map((row) => row.dni)).size,
  );

  const allSelected = createMemo(
    () =>
      sortedRows().length > 0 && selectedRows().size === sortedRows().length,
  );

  const currentTypeLabel = createMemo(() => {
    if (!showAdvanced()) {
      const inferred = inferPeopleSearchType(controller.query());
      return SEARCH_LABELS[inferred] ?? inferred;
    }
    return SEARCH_LABELS[controller.searchType()] ?? controller.searchType();
  });

  const toggleAll = () => {
    if (allSelected()) {
      setSelectedRows(new Set<string>());
    } else {
      setSelectedRows(new Set<string>(sortedRows().map((row) => row.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exportSelected = () => {
    const selected = sortedRows().filter((row) => selectedRows().has(row.id));
    const csv = [
      "Name,DNI,Aliases,Companies,RUCs,Phones",
      ...selected.map(
        (row) =>
          `"${row.name}","${row.dni}","${row.aliases}","${row.companies}","${row.rucs}","${row.phones}"`,
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "people.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  onMount(() => {
    void controller.initializeFromParams();
  });

  return (
    <AppPage class={styles.page}>
      <section class={styles.panel}>
        <div class={styles.searchPanel}>
          <div class={styles.searchHead}>
            <div class={styles.tabList}>
              <A
                href="/contacts/people"
                class={cn(styles.tab, styles.tabActive)}
              >
                People
              </A>
              <A href="/contacts/companies" class={styles.tab}>
                Companies
              </A>
            </div>
          </div>

          <form
            class={styles.searchBar}
            onSubmit={(event) => {
              event.preventDefault();
              if (!showAdvanced()) {
                controller.setSearchType(
                  inferPeopleSearchType(controller.query()),
                );
              }
              void controller.runCurrentSearch();
            }}
          >
            <input
              class={styles.searchBarInput}
              placeholder="Name, DNI, company, RUC or phone"
              value={controller.query()}
              onInput={(e) => controller.setQuery(e.currentTarget.value)}
              required
            />
            <span class={styles.typeBadge}>{currentTypeLabel()}</span>
            <button
              type="submit"
              class={styles.searchButton}
              disabled={controller.searching()}
            >
              {controller.searching() ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              class={cn(
                styles.advancedToggle,
                showAdvanced() && styles.advancedToggleActive,
              )}
              onClick={() => setShowAdvanced(!showAdvanced())}
            >
              Advanced
            </button>
          </form>

          <Show when={showAdvanced()}>
            <div class={styles.advancedRow}>
              <div class={styles.advancedField}>
                <span class={styles.advancedLabel}>Type</span>
                <select
                  class={styles.advancedSelect}
                  value={controller.searchType()}
                  onInput={(e) => {
                    const next = PEOPLE_SEARCH_TYPES.find(
                      (t) => t === e.currentTarget.value,
                    );
                    if (next) controller.setSearchType(next);
                  }}
                >
                  <For each={PEOPLE_SEARCH_TYPES}>
                    {(type) => (
                      <option value={type}>
                        {SEARCH_LABELS[type] ?? type}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <div class={styles.advancedField}>
                <span class={styles.advancedLabel}>Limit</span>
                <input
                  class={styles.advancedInput}
                  type="number"
                  min="1"
                  max="100"
                  value={controller.limit()}
                  onInput={(e) => controller.setLimit(e.currentTarget.value)}
                />
              </div>
            </div>
          </Show>
        </div>

        <Show when={controller.error()}>
          {(message) => <div class={styles.errorBar}>{message()}</div>}
        </Show>

        <Show when={selectedRows().size > 0}>
          <div class={styles.bulkBar}>
            <span>{selectedRows().size} selected</span>
            <button
              type="button"
              class={styles.bulkAction}
              onClick={exportSelected}
            >
              Export to CSV
            </button>
            <button
              type="button"
              class={styles.bulkAction}
              onClick={() => setSelectedRows(new Set<string>())}
            >
              Clear selection
            </button>
          </div>
        </Show>

        <div class={styles.viewBar}>
          <div class={styles.viewPicker}>
            <span>All People</span>
            <span class={styles.muted}>· {sortedRows().length}</span>
          </div>
          <div class={styles.viewActions}>
            <div class={styles.filterMenu}>
              <button
                type="button"
                class={styles.viewAction}
                onClick={() => setShowFilterMenu(!showFilterMenu())}
              >
                Filter
                <Show when={filterHasPhone()}>
                  <span class={styles.activeDot} />
                </Show>
              </button>
              <Show when={showFilterMenu()}>
                <div class={styles.dropdown}>
                  <label class={styles.dropdownItem}>
                    <input
                      type="checkbox"
                      checked={filterHasPhone()}
                      onInput={(e) =>
                        setFilterHasPhone(e.currentTarget.checked)
                      }
                    />
                    Has phone number
                  </label>
                  <Show when={filterHasPhone()}>
                    <div class={styles.dropdownDivider} />
                    <button
                      type="button"
                      class={styles.dropdownButton}
                      onClick={() => setFilterHasPhone(false)}
                    >
                      Clear filters
                    </button>
                  </Show>
                </div>
              </Show>
            </div>
            <div class={styles.sortMenu}>
              <button
                type="button"
                class={styles.viewAction}
                onClick={() => setShowSortMenu(!showSortMenu())}
              >
                Sort
              </button>
              <Show when={showSortMenu()}>
                <div class={styles.dropdown}>
                  <button
                    type="button"
                    class={cn(
                      styles.dropdownButton,
                      sortBy() === "name" && styles.dropdownButtonActive,
                    )}
                    onClick={() => {
                      setSortBy("name");
                      setShowSortMenu(false);
                    }}
                  >
                    By name
                  </button>
                  <button
                    type="button"
                    class={cn(
                      styles.dropdownButton,
                      sortBy() === "companies" && styles.dropdownButtonActive,
                    )}
                    onClick={() => {
                      setSortBy("companies");
                      setShowSortMenu(false);
                    }}
                  >
                    By companies
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class={styles.tableWrap}>
          <table class={styles.table}>
            <thead>
              <tr>
                <th class={cn(styles.tableHeadCell, styles.tableCheckboxCell)}>
                  <input
                    type="checkbox"
                    class={styles.checkbox}
                    checked={allSelected()}
                    onInput={toggleAll}
                  />
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
              <For each={sortedRows()}>
                {(row) => (
                  <tr>
                    <td class={cn(styles.tableCell, styles.tableCheckboxCell)}>
                      <input
                        type="checkbox"
                        class={styles.checkbox}
                        checked={selectedRows().has(row.id)}
                        onInput={() => toggleRow(row.id)}
                      />
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
                              href={`/contacts/companies?type=${company.ruc ? "ruc" : "company_name"}&query=${encodeURIComponent(company.ruc ?? company.name)}&limit=${encodeURIComponent(controller.limit())}`}
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
              <Show when={sortedRows().length === 0}>
                <tr>
                  <td
                    colSpan={7}
                    class={cn(styles.tableCell, styles.tableEmpty)}
                  >
                    Run a search by DNI, name, company, RUC or phone to list
                    people and follow linked companies.
                  </td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>

        <div class={styles.footer}>
          <div>
            Unique DNIs{" "}
            <span class={styles.footerStrong}>{uniqueDniCount()}</span>
          </div>
          <div class={styles.footerRight}>
            People rows <span class={styles.footerStrong}>{rows().length}</span>
          </div>
        </div>
      </section>
    </AppPage>
  );
}
