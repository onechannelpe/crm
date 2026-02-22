import { A, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Phone from "~/components/icons/phone";
import User from "~/components/icons/user";
import { AppPage, AppPanel } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { createClientSearchController } from "~/features/client-search/controller";
import {
  inferCompanySearchType,
  SEARCH_LABELS,
  toInitial,
} from "~/features/client-search/display";
import { groupCompaniesByRuc } from "~/features/client-search/grouping";
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

export default function ClientSearchCompaniesPage() {
  const [searchParams] = useSearchParams();
  const [showAdvanced, setShowAdvanced] = createSignal(false);
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
    () =>
      sortedRows().length > 0 && selectedRows().size === sortedRows().length,
  );

  const currentTypeLabel = createMemo(() => {
    if (!showAdvanced()) {
      const inferred = inferCompanySearchType(controller.query());
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

  const hasActiveFilters = () =>
    filterHasPhone() || filterMinRecords() !== null;

  onMount(() => {
    void controller.initializeFromParams();
  });

  return (
    <AppPage class={styles.page}>
      <AppPanel>
        <div class={styles.searchPanel}>
          <div class={styles.searchHead}>
            <div class={styles.tabList}>
              <A href="/contacts/people" class={styles.tab}>
                People
              </A>
              <A
                href="/contacts/companies"
                class={cn(styles.tab, styles.tabActive)}
              >
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
                  inferCompanySearchType(controller.query()),
                );
              }
              void controller.runCurrentSearch();
            }}
          >
            <input
              class={styles.searchBarInput}
              placeholder="Company, RUC, contact, DNI or phone"
              value={controller.query()}
              onInput={(e) => controller.setQuery(e.currentTarget.value)}
              required
            />
            <span class={styles.typeBadge}>{currentTypeLabel()}</span>
            <Button type="submit" disabled={controller.searching()}>
              {controller.searching() ? "Searching..." : "Search"}
            </Button>
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
                    const next = COMPANY_SEARCH_TYPES.find(
                      (t) => t === e.currentTarget.value,
                    );
                    if (next) controller.setSearchType(next);
                  }}
                >
                  <For each={COMPANY_SEARCH_TYPES}>
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
                      onClick={() => {
                        setFilterHasPhone(false);
                        setFilterMinRecords(null);
                      }}
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

        <Show
          when={sortedRows().length > 0 || controller.searching()}
          fallback={
            <div
              class={cn(styles.tableCell, styles.tableEmpty)}
              style={{ "text-align": "center", padding: "var(--font-24)" }}
            >
              Run a search by RUC, company, contact, DNI or phone to list
              companies and jump to related people.
            </div>
          }
        >
          <div class={styles.tableWrap}>
            <table class={styles.table}>
              <thead>
                <tr>
                  <th
                    class={cn(styles.tableHeadCell, styles.tableCheckboxCell)}
                  >
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
                      <td
                        class={cn(styles.tableCell, styles.tableCheckboxCell)}
                      >
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
                                href={`/contacts/people?type=${person.dni ? "dni" : "person_name"}&query=${encodeURIComponent(person.dni ?? person.name)}&limit=${encodeURIComponent(controller.limit())}`}
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
              </tbody>
            </table>
          </div>
        </Show>

        <div class={styles.footer}>
          <div>
            Unique RUCs{" "}
            <span class={styles.footerStrong}>{uniqueRucCount()}</span>
          </div>
          <div class={styles.footerRight}>
            Company rows{" "}
            <span class={styles.footerStrong}>{rows().length}</span>
          </div>
        </div>
      </AppPanel>
    </AppPage>
  );
}
