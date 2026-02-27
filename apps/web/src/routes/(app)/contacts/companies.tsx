import { useSearchParams } from "@solidjs/router";
import { A } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import { createStore } from "solid-js/store";

import { useMainDetailPanel } from "~/components/providers/main-detail-panel-provider";
import { TableCell, TableRow } from "~/components/ui/layout/table";
import { ContactsSearchLayout } from "~/features/client-search/contacts-search-layout";
import { createClientSearchController } from "~/features/client-search/controller";
import { inferCompanySearchType } from "~/features/client-search/display";
import { toInitial } from "~/features/client-search/display";
import {
  CompanyDetailDrawer,
  type OverlayChangeHandler,
} from "~/features/client-search/drawer";
import {
  groupCompaniesByRuc,
  type CompanyGroup,
} from "~/features/client-search/grouping";
import type { SearchEnrichmentOverlay } from "~/server/client-search/enrichment-service";

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
  { label: "Empresa" },
  { label: "RUC" },
  { label: "Contactos" },
  { label: "Teléfonos" },
];
const PILL_PAGE_SIZE = 3;

interface CollapsedPillListProps<T> {
  items: readonly T[];
  maxVisible?: number;
  class?: string;
  onMoreClick?: () => void;
  renderItem: (item: T) => JSX.Element;
}

function CollapsedPillList<T>(props: CollapsedPillListProps<T>) {
  const visibleItems = createMemo(() =>
    props.items.slice(0, props.maxVisible ?? PILL_PAGE_SIZE),
  );
  const hiddenCount = createMemo(() =>
    Math.max(0, props.items.length - visibleItems().length),
  );

  return (
    <div class={`${styles.pillWrap}${props.class ? ` ${props.class}` : ""}`}>
      <Show
        when={props.items.length > 0}
        fallback={<span class={styles.pill}>—</span>}
      >
        <For each={visibleItems()}>{(item) => props.renderItem(item)}</For>
      </Show>
      <Show when={hiddenCount() > 0}>
        <button
          type="button"
          class={`${styles.pill} ${styles.pillButton}`}
          onClick={(event) => {
            event.stopPropagation();
            props.onMoreClick?.();
          }}
        >
          +{hiddenCount()} more
        </button>
      </Show>
    </div>
  );
}

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
  const { setPanel, clearPanel } = useMainDetailPanel();

  const [overlays, setOverlays] = createStore<
    Record<string, SearchEnrichmentOverlay | null>
  >({});
  const handleOverlayChange: OverlayChangeHandler = (key, overlay) => {
    setOverlays(key, overlay);
  };

  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const selectedGroup = createMemo(
    () => grouped().find((g) => g.key === selectedKey()) ?? null,
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
      <CompanyDetailDrawer
        group={group}
        onClose={() => setSelectedKey(null)}
        onOverlayChange={handleOverlayChange}
      />,
    );
  });

  onCleanup(() => {
    clearPanel();
  });

  return (
    <ContactsSearchLayout
      activeTab="companies"
      placeholder="Empresa, RUC, contacto, DNI o teléfono"
      controller={controller}
      inferType={inferCompanySearchType}
      columns={COLUMNS}
      resultCount={() => rows().length}
      rows={() => (
        <For each={rows()}>
          {(row, i) => {
            const group = () => grouped()[i()];
            const isActive = () => selectedKey() === group()?.key;
            return (
              <TableRow
                class={`${styles.rowClickable}${isActive() ? ` ${styles.rowActive}` : ""}`}
                onClick={() =>
                  setSelectedKey(isActive() ? null : (group()?.key ?? null))
                }
              >
                <TableCell>
                  {(() => {
                    const ruc = row.ruc !== "—" ? row.ruc : null;
                    const enrichedName = ruc
                      ? (overlays[`ruc:${ruc}`]?.legalName ?? null)
                      : null;
                    const displayName = enrichedName || row.name;
                    return (
                      <span class={styles.chip}>
                        <span class={styles.squareDot}>
                          {toInitial(displayName)}
                        </span>
                        <span class={styles.chipLabel}>{displayName}</span>
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <span class={styles.pill}>{row.ruc}</span>
                </TableCell>
                <TableCell>
                  <CollapsedPillList
                    items={row.contacts}
                    class={styles.pillWrapTable}
                    onMoreClick={() => setSelectedKey(group()?.key ?? null)}
                    renderItem={(person) => (
                      <A
                        href={`/contacts/people?type=${person.dni ? "dni" : "person_name"}&query=${encodeURIComponent(person.dni ?? person.name)}&limit=20`}
                        class={styles.pill}
                        onClick={(e) => e.stopPropagation()}
                        title={person.name}
                      >
                        <span class={styles.pillText}>{person.name}</span>
                      </A>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <CollapsedPillList
                    items={row.phones}
                    class={styles.pillWrapTable}
                    onMoreClick={() => setSelectedKey(group()?.key ?? null)}
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
          RUCs únicos{" "}
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
          Empresas <span class={styles.footerStrong}>{rows().length}</span>
        </>
      )}
    />
  );
}
