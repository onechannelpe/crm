import { createAsync } from "@solidjs/router";
import { For, Show, createMemo, createSignal, type JSX } from "solid-js";

import { listLeads, registerLead } from "~/actions/pipeline/leads";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChevronDown from "~/components/icons/chevron-down";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import House from "~/components/icons/house";
import Plus from "~/components/icons/plus";
import Package from "~/components/icons/package";
import Settings from "~/components/icons/settings";
import { Badge } from "~/components/ui/display/badge";
import { Checkbox } from "~/components/ui/input/checkbox";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createLeadDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { toAppError } from "~/lib/app-errors";
import { formatDate } from "~/lib/utils";

import styles from "./leads-record-index.module.css";

type LeadRow = Awaited<ReturnType<typeof listLeads>>[number];
type SortKey = "created_at_desc" | "created_at_asc" | "ruc_asc" | "ruc_desc";

type LeadColumn = {
  key: "ruc" | "razon_social" | "address" | "stage" | "created_at";
  label: string;
  width: number;
  sticky?: boolean;
  icon: JSX.Element;
  render: (lead: LeadRow) => string | JSX.Element;
};

const ALL_COLUMNS = [
  {
    key: "ruc",
    label: "RUC",
    width: 210,
    sticky: true,
    icon: <CircleQuestionMark size={14} />,
    render: (lead) => <span class={styles.identifierText}>{lead.ruc}</span>,
  },
  {
    key: "razon_social",
    label: "Razón social",
    width: 320,
    icon: <Building2 size={14} />,
    render: (lead) => (
      <div class={styles.fieldWithIcon}>
        <span class={styles.fieldIcon}>
          <Building2 size={14} />
        </span>
        <span class={styles.cellText}>{lead.razon_social || "Sin datos"}</span>
      </div>
    ),
  },
  {
    key: "address",
    label: "Dirección",
    width: 360,
    icon: <House size={14} />,
    render: (lead) => (
      <div class={styles.fieldWithIcon}>
        <span class={styles.fieldIcon}>
          <House size={14} />
        </span>
        <span class={styles.mutedCellText}>{lead.address || "Sin datos"}</span>
      </div>
    ),
  },
  {
    key: "stage",
    label: "Etapa",
    width: 170,
    icon: <Package size={14} />,
    render: (lead) => (
      <Badge
        variant={
          lead.stage === "READY_FOR_SALE"
            ? "success"
            : lead.stage === "NEEDS_EXECUTIVE_INPUT"
              ? "warning"
              : "secondary"
        }
      >
        {lead.stage}
      </Badge>
    ),
  },
  {
    key: "created_at",
    label: "Creado",
    width: 140,
    icon: <CalendarDays size={14} />,
    render: (lead) => (
      <span class={styles.mutedCellText}>{formatDate(lead.created_at)}</span>
    ),
  },
] satisfies ReadonlyArray<LeadColumn>;

const FILTER_OPTIONS = [
  { value: "all", label: "All prospects" },
  { value: "NEW", label: "New" },
  { value: "NEEDS_EXECUTIVE_INPUT", label: "Needs executive input" },
  { value: "READY_FOR_SALE", label: "Ready for sale" },
] as const;

const SORT_OPTIONS = [
  { value: "created_at_desc", label: "Newest first" },
  { value: "created_at_asc", label: "Oldest first" },
  { value: "ruc_asc", label: "RUC A-Z" },
  { value: "ruc_desc", label: "RUC Z-A" },
] as const satisfies ReadonlyArray<{ value: SortKey; label: string }>;

function sortLeads(leads: LeadRow[], sortKey: SortKey) {
  const items = [...leads];

  items.sort((left, right) => {
    switch (sortKey) {
      case "created_at_desc":
        return right.created_at - left.created_at;
      case "created_at_asc":
        return left.created_at - right.created_at;
      case "ruc_asc":
        return left.ruc.localeCompare(right.ruc);
      case "ruc_desc":
        return right.ruc.localeCompare(left.ruc);
      default:
        sortKey satisfies never;
        return 0;
    }
  });

  return items;
}

export function LeadsRecordIndex() {
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
  const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
  const [visibleColumnKeys, setVisibleColumnKeys] = createSignal(
    ALL_COLUMNS.map((column) => column.key),
  );
  const [filterMenuOpen, setFilterMenuOpen] = createSignal(false);
  const [sortMenuOpen, setSortMenuOpen] = createSignal(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = createSignal(false);

  const visibleColumns = createMemo(() =>
    ALL_COLUMNS.filter((column) => visibleColumnKeys().includes(column.key)),
  );

  const filteredLeads = createMemo(() => {
    const filtered =
      stageFilter() === "all"
        ? leads()
        : leads().filter((lead) => lead.stage === stageFilter());

    return sortLeads(filtered, sortKey());
  });

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
      setDraftRuc("");
      setShowDraftRow(false);
      setReloadToken((current) => current + 1);
    } catch (registerError) {
      setError(
        toAppError(registerError, "Error al registrar prospecto").publicMessage,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openLeadPanel(lead: Pick<LeadRow, "id" | "ruc" | "razon_social">) {
    openPanel(
      createLeadDetailSidePanelPage({
        leadId: lead.id,
        title: lead.razon_social || lead.ruc,
        subtitle: `RUC ${lead.ruc}`,
      }),
    );
  }

  function toggleSelected(id: number, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...current, id] : current.filter((value) => value !== id),
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? filteredLeads().map((lead) => lead.id) : []);
  }

  function toggleColumn(key: LeadColumn["key"]) {
    setVisibleColumnKeys((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== key);
      }

      const next = [...current, key];
      return ALL_COLUMNS.filter((column) => next.includes(column.key)).map(
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

  const identifierColumn = createMemo(
    () =>
      visibleColumns().find((column) => column.sticky) ?? visibleColumns()[0],
  );

  return (
    <div class={`${styles.page} record-index-container-gater-for-drag-select`}>
      <div class={styles.viewBar}>
        <div class={styles.viewBarTop}>
          <button type="button" class={styles.viewPicker}>
            <span>All prospects</span>
            <ChevronDown size={14} />
          </button>
          <div class={styles.viewActions}>
            <div class={styles.menuWrap}>
              <button
                type="button"
                class={styles.toolbarButton}
                data-open={filterMenuOpen() ? "true" : "false"}
                onClick={() => {
                  setFilterMenuOpen((open) => !open);
                  setSortMenuOpen(false);
                  setOptionsMenuOpen(false);
                }}
              >
                Filter
              </button>
              <Show when={filterMenuOpen()}>
                <div class={styles.menu}>
                  <For each={FILTER_OPTIONS}>
                    {(option) => (
                      <button
                        type="button"
                        class={styles.menuItem}
                        data-active={
                          stageFilter() === option.value ? "true" : "false"
                        }
                        onClick={() => {
                          setStageFilter(option.value);
                          setFilterMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            <div class={styles.menuWrap}>
              <button
                type="button"
                class={styles.toolbarButton}
                data-open={sortMenuOpen() ? "true" : "false"}
                onClick={() => {
                  setSortMenuOpen((open) => !open);
                  setFilterMenuOpen(false);
                  setOptionsMenuOpen(false);
                }}
              >
                Sort
              </button>
              <Show when={sortMenuOpen()}>
                <div class={styles.menu}>
                  <For each={SORT_OPTIONS}>
                    {(option) => (
                      <button
                        type="button"
                        class={styles.menuItem}
                        data-active={
                          sortKey() === option.value ? "true" : "false"
                        }
                        onClick={() => {
                          setSortKey(option.value);
                          setSortMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            <div class={styles.menuWrap}>
              <button
                type="button"
                class={styles.toolbarButton}
                data-open={optionsMenuOpen() ? "true" : "false"}
                onClick={() => {
                  setOptionsMenuOpen((open) => !open);
                  setFilterMenuOpen(false);
                  setSortMenuOpen(false);
                }}
              >
                Options
              </button>
              <Show when={optionsMenuOpen()}>
                <div class={styles.menu}>
                  <div class={styles.menuSectionLabel}>Visible fields</div>
                  <For each={ALL_COLUMNS}>
                    {(column) => (
                      <button
                        type="button"
                        class={styles.menuItem}
                        data-active={
                          visibleColumnKeys().includes(column.key)
                            ? "true"
                            : "false"
                        }
                        onClick={() => toggleColumn(column.key)}
                      >
                        <input
                          checked={visibleColumnKeys().includes(column.key)}
                          class={styles.menuCheckbox}
                          type="checkbox"
                        />
                        <span>{column.label}</span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>

      <div class={styles.indexContainer}>
        <div class={styles.tableContainer}>
          <div class={styles.scrollWrapper}>
            <div class={styles.table} role="table" aria-label="Prospectos">
              <div class={styles.headerRow} role="row">
                <div
                  class={`${styles.headerCell} ${styles.dragCell}`}
                  role="columnheader"
                />
                <div
                  class={`${styles.headerCell} ${styles.checkboxCell}`}
                  role="columnheader"
                >
                  <Checkbox
                    checked={
                      filteredLeads().length > 0 &&
                      selectedIds().length === filteredLeads().length
                    }
                    onChange={(event) => toggleAll(event.currentTarget.checked)}
                  />
                </div>
                <For each={visibleColumns()}>
                  {(column) => (
                    <div
                      class={`${styles.headerCell} ${column.key === identifierColumn()?.key ? styles.identifierColumn : ""}`}
                      classList={{
                        [styles.stickyIdentifierCell]:
                          column.key === identifierColumn()?.key,
                      }}
                      role="columnheader"
                      style={{
                        width: `${column.width}px`,
                        "min-width": `${column.width}px`,
                      }}
                    >
                      <span class={styles.headerCellContent}>
                        <span class={styles.headerIcon}>{column.icon}</span>
                        <span>{column.label}</span>
                      </span>
                    </div>
                  )}
                </For>
                <div class={styles.addColumnCell} role="columnheader">
                  <button
                    type="button"
                    class={styles.addColumnButton}
                    onClick={() => setOptionsMenuOpen(true)}
                    aria-label="Agregar columna"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div class={styles.trailingFillCell} role="columnheader" />
              </div>

              <Show when={showDraftRow()}>
                <div class={styles.draftRow} role="row">
                  <div class={`${styles.bodyCell} ${styles.dragCell}`} />
                  <div class={`${styles.bodyCell} ${styles.checkboxCell}`} />
                  <For each={visibleColumns()}>
                    {(column) => (
                      <div
                        class={`${styles.bodyCell} ${column.key === identifierColumn()?.key ? styles.identifierColumn : ""}`}
                        classList={{
                          [styles.stickyIdentifierCell]:
                            column.key === identifierColumn()?.key,
                        }}
                        style={{
                          width: `${column.width}px`,
                          "min-width": `${column.width}px`,
                        }}
                      >
                        <Show
                          when={column.key === "ruc"}
                          fallback={
                            <span class={styles.placeholderText}>
                              Se completa al guardar
                            </span>
                          }
                        >
                          <form
                            class={styles.inlineComposer}
                            onSubmit={(event) => {
                              event.preventDefault();
                              void handleRegister();
                            }}
                          >
                            <input
                              class={styles.inlineInput}
                              value={draftRuc()}
                              onInput={(event) =>
                                setDraftRuc(event.currentTarget.value)
                              }
                              placeholder="Ingresa el RUC"
                              inputMode="numeric"
                              autofocus
                            />
                            <div class={styles.inlineComposerActions}>
                              <button
                                type="submit"
                                class={styles.inlineSaveButton}
                                disabled={
                                  submitting() || draftRuc().trim().length === 0
                                }
                              >
                                {submitting() ? "Guardando..." : "Save"}
                              </button>
                              <button
                                type="button"
                                class={styles.inlineCancelButton}
                                disabled={submitting()}
                                onClick={closeDraftRow}
                              >
                                Cancel
                              </button>
                            </div>
                            <Show when={error()}>
                              {(message) => (
                                <span class={styles.errorText}>
                                  {message()}
                                </span>
                              )}
                            </Show>
                          </form>
                        </Show>
                      </div>
                    )}
                  </For>
                  <div class={styles.addColumnCell} />
                  <div class={styles.trailingFillCell} />
                </div>
              </Show>

              <Show
                when={filteredLeads().length > 0}
                fallback={
                  <div class={styles.emptyState} role="rowgroup">
                    <div class={styles.emptyIcon}>
                      <Building2 size={18} />
                    </div>
                    <div class={styles.emptyTitle}>No records in this view</div>
                    <div class={styles.emptyDescription}>
                      Start with an empty row and register only the RUC.
                    </div>
                    <button
                      type="button"
                      class={styles.emptyAction}
                      onClick={openDraftRow}
                    >
                      <Plus size={14} />
                      Add New
                    </button>
                  </div>
                }
              >
                <For each={filteredLeads()}>
                  {(lead) => (
                    <div
                      class={styles.bodyRow}
                      role="row"
                      onClick={() => openLeadPanel(lead)}
                    >
                      <div class={`${styles.bodyCell} ${styles.dragCell}`}>
                        <span class={styles.dragHandle} />
                      </div>
                      <div
                        class={`${styles.bodyCell} ${styles.checkboxCell}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds().includes(lead.id)}
                          onChange={(event) =>
                            toggleSelected(lead.id, event.currentTarget.checked)
                          }
                        />
                      </div>
                      <For each={visibleColumns()}>
                        {(column) => (
                          <div
                            class={`${styles.bodyCell} ${column.key === identifierColumn()?.key ? styles.identifierColumn : ""}`}
                            classList={{
                              [styles.stickyIdentifierCell]:
                                column.key === identifierColumn()?.key,
                            }}
                            style={{
                              width: `${column.width}px`,
                              "min-width": `${column.width}px`,
                            }}
                          >
                            {column.render(lead)}
                          </div>
                        )}
                      </For>
                      <div class={styles.addColumnCell}>
                        <button
                          type="button"
                          class={styles.rowOptionsButton}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Settings size={14} />
                        </button>
                      </div>
                      <div class={styles.trailingFillCell} />
                    </div>
                  )}
                </For>

                <Show when={!showDraftRow()}>
                  <button
                    type="button"
                    class={styles.actionRow}
                    onClick={openDraftRow}
                  >
                    <div class={styles.dragCell} />
                    <div class={styles.actionIconCell}>
                      <Plus size={14} />
                    </div>
                    <div
                      class={`${styles.actionLabelCell} ${styles.stickyIdentifierCell}`}
                      style={{
                        width: `${identifierColumn()?.width ?? 210}px`,
                        "min-width": `${identifierColumn()?.width ?? 210}px`,
                      }}
                    >
                      <span>Add New</span>
                    </div>
                    <div class={styles.actionSpacer} />
                    <div class={styles.addColumnCell} />
                    <div class={styles.trailingFillCell} />
                  </button>
                </Show>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
