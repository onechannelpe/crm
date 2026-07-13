import { createMemo, createSignal, type Accessor, type Setter } from "solid-js";

import { createDataGridSelection } from "~/features/data-grid/hooks/create-selection";
import type { DataGridSelectionController } from "~/features/data-grid/model/selection";
import type { DataGridSource } from "~/features/data-grid/model/source";
import type { DataGridColumn } from "~/features/data-grid/model/types";

import {
  getVisibleRecordIndexColumns,
  hasHiddenRecordIndexColumns,
  toggleRecordIndexVisibleColumnKey,
} from "./columns";
import type {
  RecordIndexDefinition,
  RecordIndexPresentationDefinition,
  RecordIndexSearchControl,
} from "./definition";

export type RecordIndexMenu = "filter" | "sort" | "options" | "views" | null;

type RecordIndexFilterPanel =
  | { kind: "field-list" }
  | { kind: "field-value"; fieldId: string }
  | { kind: "any-field-search" };

type RecordIndexFilteringController = {
  value: Accessor<string | undefined>;
  set: (value: string | undefined) => void;
  isActive: Accessor<boolean>;
  panel: Accessor<RecordIndexFilterPanel>;
  setPanel: Setter<RecordIndexFilterPanel>;
};

type RecordIndexSortingController = {
  value: Accessor<string | undefined>;
  set: (value: string | undefined) => void;
  isActive: Accessor<boolean>;
};

export type RecordIndexUiController = {
  definition: RecordIndexPresentationDefinition;
  counts: {
    pickerMeta: Accessor<string>;
    total: Accessor<number | undefined>;
  };
  columns: {
    openMenu: Accessor<RecordIndexMenu>;
    setOpenMenu: Setter<RecordIndexMenu>;
    visibleKeys: Accessor<ReadonlySet<string>>;
    hasHidden: Accessor<boolean>;
    toggle: (key: string) => void;
  };
  filtering?: RecordIndexFilteringController;
  sorting?: RecordIndexSortingController;
  view?: {
    value: Accessor<string>;
    set: (id: string) => void;
  };
  search?: RecordIndexSearchControl;
};

export type RecordIndexController<T extends { id: string }> = Omit<
  RecordIndexUiController,
  "definition"
> & {
  definition: RecordIndexDefinition<T>;
  source: Accessor<DataGridSource<T>>;
  visibleColumns: Accessor<ReadonlyArray<DataGridColumn<T>>>;
  selection: DataGridSelectionController;
};

function isActive(value: string | undefined, defaultValue: string | undefined) {
  return value !== undefined && value !== defaultValue;
}

export function createRecordIndexController<T extends { id: string }>(
  definition: RecordIndexDefinition<T>,
): RecordIndexController<T> {
  const source = createMemo(definition.source);
  const [openMenu, setOpenMenu] = createSignal<RecordIndexMenu>(null);
  const [visibleKeys, setVisibleKeys] = createSignal<ReadonlySet<string>>(
    new Set(definition.columns.map((column) => column.key)),
  );
  const [filterPanel, setFilterPanel] = createSignal<RecordIndexFilterPanel>({
    kind: "field-list",
  });

  const visibleColumns = createMemo(() =>
    getVisibleRecordIndexColumns(definition.columns, visibleKeys()),
  );
  const visible = createMemo(() => source().rows.length);
  const total = createMemo(() => source().totalCount);
  const pickerMeta = createMemo(() => {
    const visibleCount = visible();
    const totalCount = total();

    return typeof totalCount === "number" && totalCount !== visibleCount
      ? `${visibleCount} of ${totalCount}`
      : String(visibleCount);
  });

  const controller = {
    definition,
    source,
    visibleColumns,
    selection: createDataGridSelection(() => source().rows),
    counts: { pickerMeta, total },
    columns: {
      openMenu,
      setOpenMenu,
      visibleKeys,
      hasHidden: createMemo(() =>
        hasHiddenRecordIndexColumns(definition.columns, visibleKeys()),
      ),
      toggle(key: string) {
        setVisibleKeys((current) =>
          toggleRecordIndexVisibleColumnKey(current, key),
        );
      },
    },
    filtering: definition.filter
      ? {
          value: definition.filter.control.value,
          set: definition.filter.control.set,
          isActive: createMemo(() =>
            isActive(
              definition.filter?.control.value(),
              definition.filter?.catalog.defaultValue,
            ),
          ),
          panel: filterPanel,
          setPanel: setFilterPanel,
        }
      : undefined,
    sorting: definition.sort
      ? {
          value: definition.sort.control.value,
          set: definition.sort.control.set,
          isActive: createMemo(() =>
            isActive(
              definition.sort?.control.value(),
              definition.sort?.catalog.defaultValue,
            ),
          ),
        }
      : undefined,
    view: definition.views
      ? {
          value: definition.views.control.value,
          set: definition.views.control.set,
        }
      : undefined,
    search: definition.search,
  } satisfies RecordIndexController<T>;

  return controller;
}
