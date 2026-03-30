import { createAsync } from "@solidjs/router";
import { For, createMemo, createSignal } from "solid-js";

import { listLeads, registerLead } from "~/actions/pipeline/leads";
import List from "~/components/icons/list";
import Plus from "~/components/icons/plus";
import {
  buildDataGridTemplateColumns,
  createDataGridSelection,
  DataGrid,
  DataGridToolbar,
  DataGridToolbarMenu,
  getStickyDataGridColumnIndex,
  SELECTION_COLUMN_WIDTH,
} from "~/features/data-grid";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createLeadDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { toAppError } from "~/lib/app-errors";

import { LEAD_COLUMNS, type LeadRow } from "./columns";
import { DraftRow } from "./draft-row";
import { EmptyState } from "./empty-state";
import {
  FILTER_OPTIONS,
  SORT_OPTIONS,
  type SortKey,
  sortLeads,
} from "./view-config";

import styles from "./styles.module.css";
import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

type ViewMenu = "filter" | "sort" | "options" | null;
const DEFAULT_VISIBLE_COLUMNS = new Set(
  LEAD_COLUMNS.map((column) => column.key),
);

export function LeadsIndex() {
  const [reloadToken, setReloadToken] = createSignal(0);
  const leads = createAsync(
    () => {
      reloadToken();
      return listLeads({});
    },
    { initialValue: [] },
  );
  const { openPanel } = useSidePanel();
  const [showDraftRow, setShowDraftRow] = createSignal(false);
  const [draftRuc, setDraftRuc] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const [stageFilter, setStageFilter] =
    createSignal<(typeof FILTER_OPTIONS)[number]["value"]>("all");
  const [sortKey, setSortKey] = createSignal<SortKey>("created_at_desc");
  const [visibleColumnKeys, setVisibleColumnKeys] = createSignal(
    DEFAULT_VISIBLE_COLUMNS,
  );
  const [openMenu, setOpenMenu] = createSignal<ViewMenu>(null);

  const visibleColumns = createMemo(() =>
    LEAD_COLUMNS.filter((column) => visibleColumnKeys().has(column.key)),
  );

  const filteredLeads = createMemo(() => {
    const filtered =
      stageFilter() === "all"
        ? leads()
        : leads().filter((lead) => lead.stage === stageFilter());

    return sortLeads(filtered, sortKey());
  });

  const selection = createDataGridSelection(filteredLeads);
  const gridTemplateColumns = createMemo(() =>
    buildDataGridTemplateColumns(visibleColumns()),
  );
  const stickyColumnIndex = createMemo(() =>
    getStickyDataGridColumnIndex(visibleColumns()),
  );

  function openLeadPanel(lead: Pick<LeadRow, "id" | "ruc" | "razon_social">) {
    openPanel(
      createLeadDetailSidePanelPage({
        leadId: lead.id,
        title: lead.razon_social || lead.ruc,
        subtitle: `RUC ${lead.ruc}`,
      }),
    );
  }

  function toggleColumn(key: string) {
    setVisibleColumnKeys((current) => {
      if (current.has(key)) {
        if (current.size === 1) return current;

        const next = new Set(current);
        next.delete(key);
        return next;
      }

      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  function openDraftRow() {
    setShowDraftRow(true);
    setError(null);
  }

  function closeDraftRow() {
    setShowDraftRow(false);
    setDraftRuc("");
    setError(null);
  }

  async function handleRegister() {
    const ruc = draftRuc().trim();
    setError(null);
    setSubmitting(true);

    try {
      const result = await registerLead({
        ruc,
        executiveId: 0,
      });

      openLeadPanel({
        id: result.id,
        ruc,
        razon_social: null,
      });
      closeDraftRow();
      setReloadToken((current) => current + 1);
    } catch (registerError) {
      setError(
        toAppError(registerError, "Error al registrar prospecto").publicMessage,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class={`${styles.page} record-index-container-gater-for-drag-select`}>
      <DataGridToolbar
        picker={{
          icon: List,
          label: "All prospects",
          count: leads().length,
        }}
        rightContent={
          <>
            <DataGridToolbarMenu
              active={stageFilter() !== "all"}
              label="Filter"
              menuId="view-bar-main-filter-dropdown-id-options"
              open={openMenu() === "filter"}
              onDismiss={() => setOpenMenu(null)}
              onToggle={() =>
                setOpenMenu((current) =>
                  current === "filter" ? null : "filter",
                )
              }
            >
              <For each={FILTER_OPTIONS}>
                {(option) => (
                  <button
                    type="button"
                    class={sharedStyles.menuItem}
                    role="menuitemradio"
                    data-active={
                      stageFilter() === option.value ? "true" : "false"
                    }
                    aria-checked={
                      stageFilter() === option.value ? "true" : "false"
                    }
                    onClick={() => {
                      setStageFilter(option.value);
                      setOpenMenu(null);
                    }}
                  >
                    {option.label}
                  </button>
                )}
              </For>
            </DataGridToolbarMenu>
            <DataGridToolbarMenu
              active={sortKey() !== "created_at_desc"}
              label="Sort"
              menuId="sort-dropdown-options"
              open={openMenu() === "sort"}
              onDismiss={() => setOpenMenu(null)}
              onToggle={() =>
                setOpenMenu((current) => (current === "sort" ? null : "sort"))
              }
            >
              <For each={SORT_OPTIONS}>
                {(option) => (
                  <button
                    type="button"
                    class={sharedStyles.menuItem}
                    role="menuitemradio"
                    data-active={sortKey() === option.value ? "true" : "false"}
                    aria-checked={sortKey() === option.value ? "true" : "false"}
                    onClick={() => {
                      setSortKey(option.value);
                      setOpenMenu(null);
                    }}
                  >
                    {option.label}
                  </button>
                )}
              </For>
            </DataGridToolbarMenu>
            <DataGridToolbarMenu
              active={visibleColumnKeys().size !== LEAD_COLUMNS.length}
              label="Options"
              menuId="object-options-dropdown-id-options"
              open={openMenu() === "options"}
              onDismiss={() => setOpenMenu(null)}
              onToggle={() =>
                setOpenMenu((current) =>
                  current === "options" ? null : "options",
                )
              }
            >
              <div class={sharedStyles.menuSectionLabel}>Visible fields</div>
              <For each={LEAD_COLUMNS}>
                {(column) => (
                  <button
                    type="button"
                    class={sharedStyles.menuItem}
                    role="menuitemcheckbox"
                    data-active={
                      visibleColumnKeys().has(column.key) ? "true" : "false"
                    }
                    aria-checked={
                      visibleColumnKeys().has(column.key) ? "true" : "false"
                    }
                    onClick={() => toggleColumn(column.key)}
                  >
                    <input
                      checked={visibleColumnKeys().has(column.key)}
                      class={sharedStyles.menuCheckbox}
                      type="checkbox"
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                    <span>{column.label}</span>
                  </button>
                )}
              </For>
            </DataGridToolbarMenu>
          </>
        }
      />

      <DataGrid
        actionRow={
          !showDraftRow()
            ? {
                icon: Plus,
                label: "Add New",
                onClick: openDraftRow,
              }
            : undefined
        }
        ariaLabel="Prospectos"
        columns={visibleColumns()}
        draftRow={
          showDraftRow() ? (
            <DraftRow
              columns={visibleColumns()}
              draftRuc={draftRuc()}
              error={error()}
              gridTemplateColumns={gridTemplateColumns()}
              onCancel={closeDraftRow}
              onDraftRucInput={setDraftRuc}
              onSubmit={() => void handleRegister()}
              stickyColumnIndex={stickyColumnIndex()}
              stickyLeft={SELECTION_COLUMN_WIDTH}
              submitting={submitting()}
            />
          ) : undefined
        }
        emptyState={<EmptyState onAddNew={openDraftRow} />}
        onRowClick={openLeadPanel}
        rows={filteredLeads()}
        selection={selection}
      />
    </div>
  );
}
