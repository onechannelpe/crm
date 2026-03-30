import { createAsync } from "@solidjs/router";
import { For, createMemo, createSignal } from "solid-js";

import { listLeads, registerLead } from "~/actions/pipeline/leads";
import List from "~/components/icons/list";
import Plus from "~/components/icons/plus";
import {
  buildDataGridTemplateColumns,
  createDataGridSelection,
  DataGridToolbar,
  DataGridToolbarMenu,
  getStickyDataGridColumnIndex,
  SELECTION_COLUMN_WIDTH,
} from "~/features/data-grid";
import {
  createRecordIndexViewState,
  RecordIndexGrid,
  RecordIndexPage,
  useRecordIndexAdapter,
} from "~/features/record-index";
import { toAppError } from "~/lib/app-errors";

import { LEADS_RECORD_INDEX_COLUMNS } from "./columns";
import { LeadsRecordIndexDraftRow } from "./draft-row";
import { LeadsRecordIndexEmptyState } from "./empty-state";
import {
  applyLeadStageFilter,
  LEADS_RECORD_INDEX_FILTERS,
  type LeadStageFilterValue,
} from "./filters";
import { useOpenLeadRecord } from "./open-row";
import {
  LEADS_RECORD_INDEX_SORTS,
  sortLeadRows,
  type LeadSortKey,
} from "./sorts";

import styles from "./styles.module.css";
import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

type ViewMenu = "filter" | "sort" | "options" | null;

const DEFAULT_VISIBLE_COLUMNS = new Set(
  LEADS_RECORD_INDEX_COLUMNS.map((column) => column.key),
);

export function LeadsRecordIndex() {
  const [reloadToken, setReloadToken] = createSignal(0);
  const leads = createAsync(
    () => {
      reloadToken();
      return listLeads({});
    },
    { initialValue: [] },
  );

  const [showDraftRow, setShowDraftRow] = createSignal(false);
  const [draftRuc, setDraftRuc] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const [stageFilter, setStageFilter] =
    createSignal<LeadStageFilterValue>("all");
  const [sortKey, setSortKey] = createSignal<LeadSortKey>("created_at_desc");

  const viewState = createRecordIndexViewState(DEFAULT_VISIBLE_COLUMNS);

  const visibleColumns = createMemo(() =>
    LEADS_RECORD_INDEX_COLUMNS.filter((column) =>
      viewState.visibleColumnKeys().has(column.key),
    ),
  );

  const filteredLeads = createMemo(() =>
    sortLeadRows(applyLeadStageFilter(leads(), stageFilter()), sortKey()),
  );

  const selection = createDataGridSelection(filteredLeads);
  const gridTemplateColumns = createMemo(() =>
    buildDataGridTemplateColumns(visibleColumns()),
  );
  const stickyColumnIndex = createMemo(() =>
    getStickyDataGridColumnIndex(visibleColumns()),
  );
  const { openLeadRecord } = useOpenLeadRecord();

  function toggleColumn(key: string) {
    viewState.setVisibleColumnKeys((current) => {
      if (current.has(key)) {
        if (current.size === 1) {
          return current;
        }

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

      openLeadRecord({
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

  const adapter = useRecordIndexAdapter({
    id: "leads",
    title: "All prospects",
    columns: visibleColumns(),
    getRows: filteredLeads,
    rowOpen: {
      mode: "panel",
      open: openLeadRecord,
    },
    filters: [...LEADS_RECORD_INDEX_FILTERS],
    sorts: [...LEADS_RECORD_INDEX_SORTS],
    emptyState: <LeadsRecordIndexEmptyState onAddNew={openDraftRow} />,
    draftRow: showDraftRow() ? (
      <LeadsRecordIndexDraftRow
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
    ) : undefined,
    actionRow: !showDraftRow()
      ? {
          icon: Plus,
          label: "Add New",
          onClick: openDraftRow,
        }
      : undefined,
  });

  return (
    <RecordIndexPage
      class={`${styles.page} record-index-container-gater-for-drag-select`}
    >
      <DataGridToolbar
        picker={{
          icon: List,
          label: adapter.title,
          count: leads().length,
        }}
        rightContent={
          <>
            <DataGridToolbarMenu
              active={stageFilter() !== "all"}
              label="Filter"
              menuId="view-bar-main-filter-dropdown-id-options"
              open={viewState.openMenu() === "filter"}
              onDismiss={() => viewState.setOpenMenu(null)}
              onToggle={() =>
                viewState.setOpenMenu((current) =>
                  current === "filter" ? null : "filter",
                )
              }
            >
              <For each={LEADS_RECORD_INDEX_FILTERS}>
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
                      viewState.setOpenMenu(null);
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
              open={viewState.openMenu() === "sort"}
              onDismiss={() => viewState.setOpenMenu(null)}
              onToggle={() =>
                viewState.setOpenMenu((current) =>
                  current === "sort" ? null : "sort",
                )
              }
            >
              <For each={LEADS_RECORD_INDEX_SORTS}>
                {(option) => (
                  <button
                    type="button"
                    class={sharedStyles.menuItem}
                    role="menuitemradio"
                    data-active={sortKey() === option.value ? "true" : "false"}
                    aria-checked={sortKey() === option.value ? "true" : "false"}
                    onClick={() => {
                      setSortKey(option.value);
                      viewState.setOpenMenu(null);
                    }}
                  >
                    {option.label}
                  </button>
                )}
              </For>
            </DataGridToolbarMenu>
            <DataGridToolbarMenu
              active={
                viewState.visibleColumnKeys().size !==
                LEADS_RECORD_INDEX_COLUMNS.length
              }
              label="Options"
              menuId="object-options-dropdown-id-options"
              open={viewState.openMenu() === "options"}
              onDismiss={() => viewState.setOpenMenu(null)}
              onToggle={() =>
                viewState.setOpenMenu((current) =>
                  current === "options" ? null : "options",
                )
              }
            >
              <div class={sharedStyles.menuSectionLabel}>Visible fields</div>
              <For each={LEADS_RECORD_INDEX_COLUMNS}>
                {(column) => (
                  <button
                    type="button"
                    class={sharedStyles.menuItem}
                    role="menuitemcheckbox"
                    data-active={
                      viewState.visibleColumnKeys().has(column.key)
                        ? "true"
                        : "false"
                    }
                    aria-checked={
                      viewState.visibleColumnKeys().has(column.key)
                        ? "true"
                        : "false"
                    }
                    onClick={() => toggleColumn(column.key)}
                  >
                    <input
                      checked={viewState.visibleColumnKeys().has(column.key)}
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

      <RecordIndexGrid
        actionRow={adapter.actionRow}
        ariaLabel="Prospectos"
        columns={adapter.columns}
        draftRow={adapter.draftRow}
        emptyState={adapter.emptyState}
        onRowClick={adapter.rowOpen.open}
        rows={adapter.getRows()}
        selection={selection}
      />
    </RecordIndexPage>
  );
}
