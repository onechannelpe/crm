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
import { cn } from "~/lib/utils";
import type { SearchType } from "~/server/shared/engine/types";

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
    const contactDnis = company.people
      .map((person) => person.dni)
      .filter(Boolean);

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
  const [selectedRows, setSelectedRows] = createSignal<Set<string>>(new Set());
  const [filterHasPhone, setFilterHasPhone] = createSignal(false);
  const [filterMinRecords, setFilterMinRecords] = createSignal<number | null>(
    null,
  );
  const [sortBy, setSortBy] = createSignal<"name" | "records" | "phones">(
    "name",
  );
  const [showFilterMenu, setShowFilterMenu] = createSignal(false);
  const [showSortMenu, setShowSortMenu] = createSignal(false);

  const controller = createClientSearchController({
    defaultType: "company_name",
    allowedTypes: COMPANY_SEARCH_TYPES,
    searchParams,
    errorFallback: "Search request failed",
  });

  const grouped = createMemo(() => groupCompaniesByRuc(controller.results()));
  const rows = createMemo(() => buildRows(grouped()));

  const filteredRows = createMemo(() => {
    let result = rows();

    if (filterHasPhone()) {
      result = result.filter((row) => row.phones !== "-");
    }

    if (filterMinRecords() !== null) {
      result = result.filter((row) => row.records >= filterMinRecords()!);
    }

    return result;
  });

  const sortedRows = createMemo(() => {
    const result = [...filteredRows()];
    const sort = sortBy();

    if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "records") {
      result.sort((a, b) => b.records - a.records);
    } else if (sort === "phones") {
      result.sort((a, b) => {
        const aCount = a.phones === "-" ? 0 : a.phones.split(" · ").length;
        const bCount = b.phones === "-" ? 0 : b.phones.split(" · ").length;
        return bCount - aCount;
      });
    }

    return result;
  });

  const uniqueRucCount = createMemo(
    () =>
      new Set(
        sortedRows()
          .filter((row) => row.ruc !== "-")
          .map((row) => row.ruc),
      ).size,
  );

  const allSelected = createMemo(
    () => sortedRows().length > 0 && selectedRows().size === sortedRows().length,
  );

  const toggleAll = () => {
    if (allSelected()) {
      setSelectedRows(new Set<string>());
    } else {
      setSelectedRows(new Set<string>(sortedRows().map((row) => row.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const exportSelected = () => {
    const selected = sortedRows().filter((row) => selectedRows().has(row.id));
    const csv = [
      "Company,RUC,Contacts,Phones",
      ...selected.map(
        (row) => `"${row.name}","${row.ruc}","${row.contacts}","${row.phones}"`,
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "companies.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilterHasPhone(false);
    setFilterMinRecords(null);
  };

  const hasActiveFilters = () =>
    filterHasPhone() || filterMinRecords() !== null;

  onMount(() => {
    void controller.initializeFromParams();
  });

  return (
    <AppPage class={styles.page}>
      <section class={styles.panel}>
        <div class={styles.searchPanel}>
          <div class={styles.tabList}>
            <A href="/client-search/people" class={styles.tab}>
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
                controller.setSearchType(
                  inferCompanySearchType(controller.query()),
                );
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
                onInput={(event) =>
                  controller.setQuery(event.currentTarget.value)
                }
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
                onInput={(event) =>
                  controller.setLimit(event.currentTarget.value)
                }
                required
              />
            </label>

            <div class={cn(styles.searchField, styles.alignEnd)}>
              <span
                class={cn(styles.searchLabel, styles.hiddenLabel)}
                aria-hidden="true"
              >
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
              {SEARCH_LABELS[controller.searchType()] ??
                controller.searchType()}
            </span>
          </div>
        </div>

        <Show when={controller.error()}>
          {(message) => <div class={styles.errorBar}>{message()}</div>}
        </Show>

        <Show when={selectedRows().size > 0}>
          <div class={styles.bulkBar}>
            <span>
              {selectedRows().size} selected
            </span>
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
              onClick={() => setSelectedRows(new Set())}
            >
              Clear selection
            </button>
          </div>
        </Show>

        <div class={styles.viewBar}>
          <div class={styles.viewPicker}>
            <span>All Companies</span>
            <span class={styles.muted}>· {sortedRows().length}</span>
            <ChevronDown class={styles.pickerIcon} size={16} />
          </div>
          <div class={styles.viewActions}>
            <div class={styles.filterMenu}>
              <button
                type="button"
                class={styles.viewAction}
                onClick={() => setShowFilterMenu(!showFilterMenu())}
              >
                Filter
                <Show when={hasActiveFilters()}>
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
                  <div class={styles.dropdownDivider} />
                  <p class={styles.dropdownLabel}>Minimum records</p>
                  <div class={styles.dropdownRadios}>
                    <label class={styles.dropdownItem}>
                      <input
                        type="radio"
                        name="minRecords"
                        checked={filterMinRecords() === null}
                        onInput={() => setFilterMinRecords(null)}
                      />
                      Any
                    </label>
                    <label class={styles.dropdownItem}>
                      <input
                        type="radio"
                        name="minRecords"
                        checked={filterMinRecords() === 5}
                        onInput={() => setFilterMinRecords(5)}
                      />
                      5+
                    </label>
                    <label class={styles.dropdownItem}>
                      <input
                        type="radio"
                        name="minRecords"
                        checked={filterMinRecords() === 10}
                        onInput={() => setFilterMinRecords(10)}
                      />
                      10+
                    </label>
                  </div>
                  <Show when={hasActiveFilters()}>
                    <div class={styles.dropdownDivider} />
                    <button
                      type="button"
                      class={styles.dropdownButton}
                      onClick={clearFilters}
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
                      sortBy() === "records" && styles.dropdownButtonActive,
                    )}
                    onClick={() => {
                      setSortBy("records");
                      setShowSortMenu(false);
                    }}
                  >
                    By records
                  </button>
                  <button
                    type="button"
                    class={cn(
                      styles.dropdownButton,
                      sortBy() === "phones" && styles.dropdownButtonActive,
                    )}
                    onClick={() => {
                      setSortBy("phones");
                      setShowSortMenu(false);
                    }}
                  >
                    By phones
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
              <Show when={sortedRows().length === 0}>
                <tr>
                  <td
                    colSpan={7}
                    class={cn(styles.tableCell, styles.tableEmpty)}
                  >
                    Run a search by RUC, company, contact, DNI or phone to list
                    companies and jump to related people.
                  </td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>

        <div class={styles.footer}>
          <div>
            Unique of RUC{" "}
            <span class={styles.footerStrong}>{uniqueRucCount()}</span>
          </div>
          <div class={styles.footerRight}>
            Company rows{" "}
            <span class={styles.footerStrong}>{rows().length}</span>
          </div>
        </div>
      </section>
    </AppPage>
  );
}
