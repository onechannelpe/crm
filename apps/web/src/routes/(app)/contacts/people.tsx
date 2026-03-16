import { useSearchParams } from "@solidjs/router";
import { A } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
} from "solid-js";
import { createStore } from "solid-js/store";

import { useMainDetailPanel } from "~/components/providers/main-detail-panel-provider";
import { TableCell, TableRow } from "~/components/ui/layout/table";
import { CollapsedPillList } from "~/features/client-search/collapsed-pill-list";
import { ContactsSearchLayout } from "~/features/client-search/contacts-search-layout";
import { createClientSearchController } from "~/features/client-search/controller";
import { inferPeopleSearchType } from "~/features/client-search/display";
import { toInitial } from "~/features/client-search/display";
import {
  PersonDetailDrawer,
  type OverlayChangeHandler,
} from "~/features/client-search/drawer";
import {
  groupPeopleByDni,
  type PersonGroup,
} from "~/features/client-search/grouping";
import type { SearchEnrichmentOverlay } from "~/server/client-search/enrichment-service";

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
  { label: "Nombre" },
  { label: "DNI" },
  { label: "Empresas" },
  { label: "Teléfonos" },
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
  const { setPanel, clearPanel } = useMainDetailPanel();

  const [overlays, setOverlays] = createStore<
    Record<string, SearchEnrichmentOverlay | null>
  >({});
  const handleOverlayChange: OverlayChangeHandler = (key, overlay) => {
    setOverlays(key, overlay);
  };

  const [selectedDni, setSelectedDni] = createSignal<string | null>(null);
  const selectedGroup = createMemo(
    () => grouped().find((g) => g.dni === selectedDni()) ?? null,
  );

  onMount(() => {
    void controller.initializeFromParams();
  });

  createEffect(() => {
    const group = selectedGroup();
    if (!group) {
      clearPanel();
      return;
    }

    setPanel(
      <PersonDetailDrawer
        group={group}
        onClose={() => setSelectedDni(null)}
        onOverlayChange={handleOverlayChange}
      />,
    );
  });

  onCleanup(() => {
    clearPanel();
  });

  return (
    <ContactsSearchLayout
      activeTab="people"
      placeholder="Nombre, DNI, empresa, RUC o teléfono"
      controller={controller}
      inferType={inferPeopleSearchType}
      columns={COLUMNS}
      resultCount={() => rows().length}
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
                  {(() => {
                    const enrichedName =
                      overlays[`dni:${row.dni}`]?.fullName ?? null;
                    const displayName = enrichedName || row.name;
                    return (
                      <span class={styles.chip}>
                        <span class={styles.avatarDot}>
                          {toInitial(displayName)}
                        </span>
                        <span class={styles.chipLabel}>{displayName}</span>
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <span class={styles.pill}>{row.dni}</span>
                </TableCell>
                <TableCell>
                  <CollapsedPillList
                    items={row.companies}
                    class={styles.pillWrapTable}
                    onMoreClick={() => setSelectedDni(row.dni)}
                    renderItem={(company) => (
                      <A
                        href={`/contacts/companies?type=${company.ruc ? "ruc" : "company_name"}&query=${encodeURIComponent(company.ruc ?? company.name)}&limit=20`}
                        class={styles.pill}
                        onClick={(e) => e.stopPropagation()}
                        title={company.name}
                      >
                        <span class={styles.pillText}>{company.name}</span>
                      </A>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <CollapsedPillList
                    items={row.phones}
                    class={styles.pillWrapTable}
                    onMoreClick={() => setSelectedDni(row.dni)}
                    renderItem={(phone) => (
                      <span class={styles.pill} title={phone}>
                        <span class={styles.pillText}>{phone}</span>
                      </span>
                    )}
                  />
                </TableCell>
              </TableRow>
            );
          }}
        </For>
      )}
      footerLeft={() => (
        <>
          DNI únicos{" "}
          <span class={styles.footerStrong}>
            {new Set(rows().map((r) => r.dni)).size}
          </span>
        </>
      )}
      footerRight={() => (
        <>
          Personas <span class={styles.footerStrong}>{rows().length}</span>
        </>
      )}
    />
  );
}
