import { createAsync } from "@solidjs/router";
import { For, createMemo, createSignal } from "solid-js";

import { listLeads, registerLead } from "~/actions/pipeline/leads";
import List from "~/components/icons/list";
import Plus from "~/components/icons/plus";
import {
  buildGridTemplateColumns,
  getStickyColumnIndex,
  SELECTION_COLUMN_WIDTH,
} from "~/components/record-index/grid";
import { ViewBarMenu } from "~/components/record-index/menu";
import { createSelectionModel } from "~/components/record-index/selection";
import { IndexTable } from "~/components/record-index/table";
import { ViewBar } from "~/components/record-index/view-bar";
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
import sharedStyles from "~/components/record-index/styles.module.css";

type ViewMenu = "filter" | "sort" | "options" | null;

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
    LEAD_COLUMNS.map((column) => column.key),
  );
  const [openMenu, setOpenMenu] = createSignal<ViewMenu>(null);

  const visibleColumns = createMemo(() =>
    LEAD_COLUMNS.filter((column) => visibleColumnKeys().includes(column.key)),
  );

  const filteredLeads = createMemo(() => {
    const filtered =
      stageFilter() === "all"
        ? leads()
        : leads().filter((lead) => lead.stage === stageFilter());

    return sortLeads(filtered, sortKey());
  });

  const selection = createSelectionModel(filteredLeads);
  const gridTemplateColumns = createMemo(() =>
    buildGridTemplateColumns(visibleColumns()),
  );
  const stickyColumnIndex = createMemo(() =>
    getStickyColumnIndex(visibleColumns()),
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
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== key);
      }

      const next = [...current, key];
      return LEAD_COLUMNS.filter((column) => next.includes(column.key)).map(
        (column) => column.key,
      );
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
    setError(null);
    setSubmitting(true);

    try {
      const result = await registerLead({
        ruc: draftRuc().trim(),
        executiveId: 0,
      });

      openLeadPanel({
        id: result.id,
        ruc: draftRuc().trim(),
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
      <ViewBar
        picker={{
          icon: <List size={16} />,
          label: "All prospects",
          count: leads().length,
        }}
        rightContent={
          <>
            <ViewBarMenu
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
            </ViewBarMenu>
            <ViewBarMenu
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
            </ViewBarMenu>
            <ViewBarMenu
              active={visibleColumnKeys().length !== LEAD_COLUMNS.length}
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
                      visibleColumnKeys().includes(column.key)
                        ? "true"
                        : "false"
                    }
                    aria-checked={
                      visibleColumnKeys().includes(column.key)
                        ? "true"
                        : "false"
                    }
                    onClick={() => toggleColumn(column.key)}
                  >
                    <input
                      checked={visibleColumnKeys().includes(column.key)}
                      class={sharedStyles.menuCheckbox}
                      type="checkbox"
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                    <span>{column.label}</span>
                  </button>
                )}
              </For>
            </ViewBarMenu>
          </>
        }
      />

      <IndexTable
        actionRow={
          !showDraftRow()
            ? {
                icon: <Plus size={14} />,
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
