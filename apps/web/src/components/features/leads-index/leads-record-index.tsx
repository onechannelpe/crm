import { createAsync } from "@solidjs/router";
import {
  For,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";

import { listLeads, registerLead } from "~/actions/pipeline/leads";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChevronDown from "~/components/icons/chevron-down";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import House from "~/components/icons/house";
import List from "~/components/icons/list";
import Package from "~/components/icons/package";
import Plus from "~/components/icons/plus";
import { Badge } from "~/components/ui/display/badge";
import { Checkbox } from "~/components/ui/input/checkbox";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createLeadDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { toAppError } from "~/lib/app-errors";
import { formatDate } from "~/lib/utils";

import styles from "./leads-record-index.module.css";

type LeadRow = Awaited<ReturnType<typeof listLeads>>[number];
type SortKey = "created_at_desc" | "created_at_asc" | "ruc_asc" | "ruc_desc";
type DragMode = "add" | "remove" | null;
type ViewMenu = "filter" | "sort" | "options" | null;

type LeadColumn = {
  key: "ruc" | "razon_social" | "address" | "stage" | "created_at";
  label: string;
  icon: JSX.Element;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  grow?: boolean;
  sticky?: boolean;
  render: (lead: LeadRow) => JSX.Element;
};

const ALL_COLUMNS = [
  {
    key: "ruc",
    label: "RUC",
    icon: <CircleQuestionMark size={14} />,
    width: 196,
    sticky: true,
    render: (lead) => <span class={styles.identifierText}>{lead.ruc}</span>,
  },
  {
    key: "razon_social",
    label: "Razón social",
    icon: <Building2 size={14} />,
    minWidth: 220,
    grow: true,
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
    icon: <House size={14} />,
    minWidth: 220,
    maxWidth: 300,
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
    icon: <Package size={14} />,
    width: 172,
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
    icon: <CalendarDays size={14} />,
    width: 140,
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

function toTrack(column: LeadColumn) {
  if (column.width) return `${column.width}px`;
  if (column.grow && column.minWidth && column.maxWidth) {
    return `minmax(${column.minWidth}px, ${column.maxWidth}px)`;
  }
  if (column.grow && column.minWidth) {
    return `minmax(${column.minWidth}px, 1fr)`;
  }
  if (column.minWidth && column.maxWidth) {
    return `minmax(${column.minWidth}px, ${column.maxWidth}px)`;
  }
  if (column.minWidth) return `minmax(${column.minWidth}px, max-content)`;
  if (column.maxWidth) return `fit-content(${column.maxWidth}px)`;
  if (column.grow) return "minmax(180px, 1fr)";
  return "max-content";
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
  const [openMenu, setOpenMenu] = createSignal<ViewMenu>(null);
  const [dragMode, setDragMode] = createSignal<DragMode>(null);
  let filterMenuContainer: HTMLDivElement | undefined;
  let sortMenuContainer: HTMLDivElement | undefined;
  let optionsMenuContainer: HTMLDivElement | undefined;

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

  const gridTemplateColumns = createMemo(
    () =>
      `40px ${visibleColumns()
        .map((column) => toTrack(column))
        .join(" ")}`,
  );

  const identifierColumnIndex = createMemo(() =>
    visibleColumns().findIndex((column) => column.sticky),
  );
  const isFilterActive = createMemo(() => stageFilter() !== "all");
  const isSortActive = createMemo(() => sortKey() !== "created_at_desc");
  const isOptionsActive = createMemo(
    () => visibleColumnKeys().length !== ALL_COLUMNS.length,
  );

  const identifierLeft = 40;

  useDismissibleLayer({
    enabled: () => openMenu() === "filter",
    onDismiss: () => setOpenMenu(null),
    getContainer: () => filterMenuContainer,
  });

  useDismissibleLayer({
    enabled: () => openMenu() === "sort",
    onDismiss: () => setOpenMenu(null),
    getContainer: () => sortMenuContainer,
  });

  useDismissibleLayer({
    enabled: () => openMenu() === "options",
    onDismiss: () => setOpenMenu(null),
    getContainer: () => optionsMenuContainer,
  });

  function openLeadPanel(lead: Pick<LeadRow, "id" | "ruc" | "razon_social">) {
    openPanel(
      createLeadDetailSidePanelPage({
        leadId: lead.id,
        title: lead.razon_social || lead.ruc,
        subtitle: `RUC ${lead.ruc}`,
      }),
    );
  }

  function setSelected(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((value) => value !== id);
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? filteredLeads().map((lead) => lead.id) : []);
  }

  function beginSelectionDrag(id: number) {
    const shouldAdd = !selectedIds().includes(id);
    setDragMode(shouldAdd ? "add" : "remove");
    setSelected(id, shouldAdd);
  }

  function updateSelectionDrag(id: number) {
    const mode = dragMode();
    if (!mode) return;
    setSelected(id, mode === "add");
  }

  onMount(() => {
    const handlePointerUp = () => setDragMode(null);
    window.addEventListener("pointerup", handlePointerUp);
    onCleanup(() => window.removeEventListener("pointerup", handlePointerUp));
  });

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

  return (
    <div class={`${styles.page} record-index-container-gater-for-drag-select`}>
      <div class={styles.viewBar}>
        <div class={styles.viewBarTop}>
          <button type="button" class={styles.viewPicker}>
            <span class={styles.viewPickerIcon}>
              <List size={16} />
            </span>
            <span class={styles.viewPickerLabel}>All prospects</span>
            <span class={styles.viewPickerMeta}>
              <Show when={typeof leads().length === "number"}>
                · {leads().length}
              </Show>
              <ChevronDown size={14} />
            </span>
          </button>
          <div class={styles.viewActions}>
            <div class={styles.menuWrap} ref={filterMenuContainer}>
              <button
                type="button"
                class={styles.toolbarButton}
                aria-controls="view-bar-main-filter-dropdown-id-options"
                aria-expanded={openMenu() === "filter" ? "true" : "false"}
                aria-haspopup="menu"
                data-active={isFilterActive() ? "true" : "false"}
                data-open={openMenu() === "filter" ? "true" : "false"}
                onClick={() =>
                  setOpenMenu((current) =>
                    current === "filter" ? null : "filter",
                  )
                }
              >
                Filter
              </button>
              <Show when={openMenu() === "filter"}>
                <div
                  class={styles.menu}
                  id="view-bar-main-filter-dropdown-id-options"
                  role="menu"
                >
                  <For each={FILTER_OPTIONS}>
                    {(option) => (
                      <button
                        type="button"
                        class={styles.menuItem}
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
                </div>
              </Show>
            </div>

            <div class={styles.menuWrap} ref={sortMenuContainer}>
              <button
                type="button"
                class={styles.toolbarButton}
                aria-controls="sort-dropdown-options"
                aria-expanded={openMenu() === "sort" ? "true" : "false"}
                aria-haspopup="menu"
                data-active={isSortActive() ? "true" : "false"}
                data-open={openMenu() === "sort" ? "true" : "false"}
                onClick={() =>
                  setOpenMenu((current) => (current === "sort" ? null : "sort"))
                }
              >
                Sort
              </button>
              <Show when={openMenu() === "sort"}>
                <div class={styles.menu} id="sort-dropdown-options" role="menu">
                  <For each={SORT_OPTIONS}>
                    {(option) => (
                      <button
                        type="button"
                        class={styles.menuItem}
                        role="menuitemradio"
                        data-active={
                          sortKey() === option.value ? "true" : "false"
                        }
                        aria-checked={
                          sortKey() === option.value ? "true" : "false"
                        }
                        onClick={() => {
                          setSortKey(option.value);
                          setOpenMenu(null);
                        }}
                      >
                        {option.label}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            <div class={styles.menuWrap} ref={optionsMenuContainer}>
              <button
                type="button"
                class={styles.toolbarButton}
                aria-controls="object-options-dropdown-id-options"
                aria-expanded={openMenu() === "options" ? "true" : "false"}
                aria-haspopup="menu"
                data-active={isOptionsActive() ? "true" : "false"}
                data-open={openMenu() === "options" ? "true" : "false"}
                onClick={() =>
                  setOpenMenu((current) =>
                    current === "options" ? null : "options",
                  )
                }
              >
                Options
              </button>
              <Show when={openMenu() === "options"}>
                <div
                  class={styles.menu}
                  id="object-options-dropdown-id-options"
                  role="menu"
                >
                  <div class={styles.menuSectionLabel}>Visible fields</div>
                  <For each={ALL_COLUMNS}>
                    {(column) => (
                      <button
                        type="button"
                        class={styles.menuItem}
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
                          class={styles.menuCheckbox}
                          type="checkbox"
                          aria-hidden="true"
                          tabIndex={-1}
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
              <div
                class={styles.headerRow}
                role="row"
                style={{ "grid-template-columns": gridTemplateColumns() }}
              >
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
                  {(column, index) => (
                    <div
                      class={`${styles.headerCell} ${index() === identifierColumnIndex() ? styles.stickyIdentifierCell : ""}`}
                      role="columnheader"
                      style={
                        index() === identifierColumnIndex()
                          ? { left: `${identifierLeft}px` }
                          : undefined
                      }
                    >
                      <span class={styles.headerCellContent}>
                        <span class={styles.headerIcon}>{column.icon}</span>
                        <span>{column.label}</span>
                      </span>
                    </div>
                  )}
                </For>
              </div>

              <Show when={showDraftRow()}>
                <div
                  class={styles.draftRow}
                  role="row"
                  style={{ "grid-template-columns": gridTemplateColumns() }}
                >
                  <div class={`${styles.bodyCell} ${styles.checkboxCell}`} />
                  <For each={visibleColumns()}>
                    {(column, index) => (
                      <div
                        class={`${styles.bodyCell} ${index() === identifierColumnIndex() ? styles.stickyIdentifierCell : ""}`}
                        style={
                          index() === identifierColumnIndex()
                            ? { left: `${identifierLeft}px` }
                            : undefined
                        }
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
                      style={{ "grid-template-columns": gridTemplateColumns() }}
                      onClick={() => openLeadPanel(lead)}
                    >
                      <div
                        class={`${styles.bodyCell} ${styles.checkboxCell}`}
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={() => beginSelectionDrag(lead.id)}
                        onPointerEnter={() => updateSelectionDrag(lead.id)}
                      >
                        <Checkbox
                          checked={selectedIds().includes(lead.id)}
                          onChange={(event) =>
                            setSelected(lead.id, event.currentTarget.checked)
                          }
                        />
                      </div>
                      <For each={visibleColumns()}>
                        {(column, index) => (
                          <div
                            class={`${styles.bodyCell} ${index() === identifierColumnIndex() ? styles.stickyIdentifierCell : ""}`}
                            style={
                              index() === identifierColumnIndex()
                                ? { left: `${identifierLeft}px` }
                                : undefined
                            }
                          >
                            {column.render(lead)}
                          </div>
                        )}
                      </For>
                    </div>
                  )}
                </For>

                <Show when={!showDraftRow()}>
                  <button
                    type="button"
                    class={styles.actionRow}
                    style={{ "grid-template-columns": gridTemplateColumns() }}
                    onClick={openDraftRow}
                  >
                    <div class={`${styles.actionCell} ${styles.checkboxCell}`}>
                      <Plus size={14} />
                    </div>
                    <div
                      class={`${styles.actionCell} ${styles.stickyIdentifierCell}`}
                      style={{ left: `${identifierLeft}px` }}
                    >
                      Add New
                    </div>
                    <div
                      class={styles.actionTail}
                      style={{
                        "grid-column": `3 / ${visibleColumns().length + 2}`,
                      }}
                    />
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
