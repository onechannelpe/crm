import { useSearchParams } from "@solidjs/router";
import { A } from "@solidjs/router";
import { createMemo, For, onMount, Show } from "solid-js";

import { TableCell, TableRow } from "~/components/ui/layout/table";
import { ContactsSearchLayout } from "~/features/client-search/contacts-search-layout";
import { createClientSearchController } from "~/features/client-search/controller";
import { inferCompanySearchType } from "~/features/client-search/display";
import { toInitial } from "~/features/client-search/display";
import {
  groupCompaniesByRuc,
  type CompanyGroup,
} from "~/features/client-search/grouping";

import styles from "~/features/client-search/contacts-search-layout.module.css";

const COMPANY_SEARCH_TYPES = [
  "ruc",
  "company_name",
  "person_name",
  "dni",
  "phone",
  "phone_enriched",
] as const;

const COLUMNS = [
  { label: "Company" },
  { label: "RUC" },
  { label: "Contacts" },
  { label: "Phones" },
];

function buildDisplayRows(groups: CompanyGroup[]) {
  return groups.map((company, index) => ({
    id: `${company.key}-${index}`,
    name: company.name ?? `Company ${index + 1}`,
    ruc: company.ruc || "—",
    contacts: company.people.map((p) => ({
      name: p.name || p.dni,
      dni: p.dni || null,
    })),
    phones: company.phones,
  }));
}

export default function ClientSearchCompaniesPage() {
  const [searchParams] = useSearchParams();
  const controller = createClientSearchController({
    defaultType: "company_name",
    allowedTypes: COMPANY_SEARCH_TYPES,
    searchParams,
    errorFallback: "Search request failed",
  });

  const grouped = createMemo(() => groupCompaniesByRuc(controller.results()));
  const rows = createMemo(() => buildDisplayRows(grouped()));

  onMount(() => {
    void controller.initializeFromParams();
  });

  return (
    <ContactsSearchLayout
      activeTab="companies"
      placeholder="Company, RUC, contact, DNI or phone"
      controller={controller}
      inferType={inferCompanySearchType}
      columns={COLUMNS}
      resultCount={() => rows().length}
      rows={() => (
        <For each={rows()}>
          {(row) => (
            <TableRow>
              <TableCell>
                <span class={styles.chip}>
                  <span class={styles.squareDot}>{toInitial(row.name)}</span>
                  <span>{row.name}</span>
                </span>
              </TableCell>
              <TableCell>
                <span class={styles.pill}>{row.ruc}</span>
              </TableCell>
              <TableCell>
                <div class={styles.pillWrap}>
                  <For each={row.contacts}>
                    {(person) => (
                      <A
                        href={`/contacts/people?type=${person.dni ? "dni" : "person_name"}&query=${encodeURIComponent(person.dni ?? person.name)}&limit=20`}
                        class={styles.pill}
                      >
                        {person.name}
                      </A>
                    )}
                  </For>
                  <Show when={row.contacts.length === 0}>
                    <span class={styles.pill}>—</span>
                  </Show>
                </div>
              </TableCell>
              <TableCell>
                <div class={styles.pillWrap}>
                  <For each={row.phones}>
                    {(phone) => <span class={styles.pill}>{phone}</span>}
                  </For>
                  <Show when={row.phones.length === 0}>
                    <span class={styles.pill}>—</span>
                  </Show>
                </div>
              </TableCell>
            </TableRow>
          )}
        </For>
      )}
      footerLeft={() => (
        <>
          Unique RUCs{" "}
          <span class={styles.footerStrong}>
            {
              new Set(
                rows()
                  .filter((r) => r.ruc !== "—")
                  .map((r) => r.ruc),
              ).size
            }
          </span>
        </>
      )}
      footerRight={() => (
        <>
          Companies <span class={styles.footerStrong}>{rows().length}</span>
        </>
      )}
    />
  );
}
