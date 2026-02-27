import { useSearchParams } from "@solidjs/router";
import { A } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";

import { TableCell, TableRow } from "~/components/ui/layout/table";
import { PersonDetailDrawer } from "~/features/client-search/contact-detail-drawer";
import { ContactsSearchLayout } from "~/features/client-search/contacts-search-layout";
import { createClientSearchController } from "~/features/client-search/controller";
import { inferPeopleSearchType } from "~/features/client-search/display";
import { toInitial } from "~/features/client-search/display";
import {
  groupPeopleByDni,
  type PersonGroup,
} from "~/features/client-search/grouping";

import styles from "~/features/client-search/contacts-search-layout.module.css";

const PEOPLE_SEARCH_TYPES = [
  "dni",
  "person_name",
  "company_name",
  "ruc",
  "phone",
  "phone_enriched",
] as const;

const COLUMNS = [
  { label: "Name" },
  { label: "DNI" },
  { label: "Companies" },
  { label: "Phones" },
];

function buildDisplayRows(groups: PersonGroup[]) {
  return groups.map((person, index) => {
    const companies = person.companies
      .filter((c) => c.name?.trim() || c.ruc?.trim())
      .map((c) => ({
        name: c.name?.trim() || c.ruc?.trim() || "Company",
        ruc: c.ruc?.trim() || null,
      }));
    return {
      id: `${person.dni}-${index}`,
      name: person.displayName || `Person ${person.dni}`,
      dni: person.dni,
      companies,
      phones: person.phones,
    };
  });
}

export default function ClientSearchPeoplePage() {
  const [searchParams] = useSearchParams();
  const controller = createClientSearchController({
    defaultType: "person_name",
    allowedTypes: PEOPLE_SEARCH_TYPES,
    searchParams,
    errorFallback: "Search request failed",
  });

  const grouped = createMemo(() => groupPeopleByDni(controller.results()));
  const rows = createMemo(() => buildDisplayRows(grouped()));

  const [selectedDni, setSelectedDni] = createSignal<string | null>(null);
  const selectedGroup = createMemo(
    () => grouped().find((g) => g.dni === selectedDni()) ?? null,
  );

  onMount(() => {
    void controller.initializeFromParams();
  });

  return (
    <ContactsSearchLayout
      activeTab="people"
      placeholder="Name, DNI, company, RUC or phone"
      controller={controller}
      inferType={inferPeopleSearchType}
      columns={COLUMNS}
      resultCount={() => rows().length}
      detail={() => {
        const group = selectedGroup();
        if (!group) return null;
        return (
          <PersonDetailDrawer
            group={group}
            onClose={() => setSelectedDni(null)}
          />
        );
      }}
      rows={() => (
        <For each={rows()}>
          {(row) => {
            const isActive = () => selectedDni() === row.dni;
            return (
              <TableRow
                class={`${styles.rowClickable}${isActive() ? ` ${styles.rowActive}` : ""}`}
                onClick={() => setSelectedDni(isActive() ? null : row.dni)}
              >
                <TableCell>
                  <span class={styles.chip}>
                    <span class={styles.avatarDot}>{toInitial(row.name)}</span>
                    <span>{row.name}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <span class={styles.pill}>{row.dni}</span>
                </TableCell>
                <TableCell>
                  <div class={styles.pillWrap}>
                    <For each={row.companies}>
                      {(company) => (
                        <A
                          href={`/contacts/companies?type=${company.ruc ? "ruc" : "company_name"}&query=${encodeURIComponent(company.ruc ?? company.name)}&limit=20`}
                          class={styles.pill}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {company.name}
                        </A>
                      )}
                    </For>
                    <Show when={row.companies.length === 0}>
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
            );
          }}
        </For>
      )}
      footerLeft={() => (
        <>
          Unique DNIs{" "}
          <span class={styles.footerStrong}>
            {new Set(rows().map((r) => r.dni)).size}
          </span>
        </>
      )}
      footerRight={() => (
        <>
          People <span class={styles.footerStrong}>{rows().length}</span>
        </>
      )}
    />
  );
}
