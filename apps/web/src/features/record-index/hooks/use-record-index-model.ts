import { createMemo } from "solid-js";

import { createDataGridSelection } from "~/features/data-grid/hooks/use-selection";

import { useRecordIndexViewState } from "../context/view-state-context";
import type { RecordIndexAdapter } from "../model/adapter";
import {
  getVisibleRecordIndexColumns,
  hasHiddenRecordIndexColumns,
  toggleRecordIndexVisibleColumnKey,
} from "../model/columns";
import type { RecordIndexModel, RecordIndexScreenModel } from "../model/model";

// A selection is active when it holds a concrete value other than its default.
function isSelectionActive(
  value: string | undefined,
  defaultValue: string | undefined,
) {
  return value !== undefined && value !== defaultValue;
}

export function useRecordIndexModel<T extends { id: string }>(
  adapter: RecordIndexAdapter<T>,
): RecordIndexScreenModel<T> {
  const viewState = useRecordIndexViewState();
  const source = createMemo(() => adapter.source());

  const visibleColumns = createMemo(() =>
    getVisibleRecordIndexColumns(
      adapter.columns,
      viewState.visibleColumnKeys(),
    ),
  );
  const hasHiddenColumns = createMemo(() =>
    hasHiddenRecordIndexColumns(adapter.columns, viewState.visibleColumnKeys()),
  );
  function toggleColumn(key: string) {
    viewState.setVisibleColumnKeys((current) =>
      toggleRecordIndexVisibleColumnKey(current, key),
    );
  }

  const visible = createMemo(() => source().rows.length);
  const total = createMemo(() => source().totalCount);
  const pickerMeta = createMemo(() => {
    const visibleCount = visible();
    const totalCount = total();

    if (typeof totalCount === "number" && totalCount !== visibleCount) {
      return `${visibleCount} of ${totalCount}`;
    }

    return String(visibleCount);
  });

  const { filter, sort, views, search } = adapter;

  const context: RecordIndexModel = {
    counts: { pickerMeta, total, visible },
    columns: {
      openMenu: viewState.openMenu,
      setOpenMenu: viewState.setOpenMenu,
      visibleColumnKeys: viewState.visibleColumnKeys,
      hasHiddenColumns,
      toggleColumn,
    },
    filtering: filter
      ? {
          value: filter.value.value,
          set: filter.value.set,
          isActive: createMemo(() =>
            isSelectionActive(
              filter.value.value(),
              filter.catalog.defaultValue,
            ),
          ),
          panel: viewState.filterPanel,
          setPanel: viewState.setFilterPanel,
        }
      : undefined,
    sorting: sort
      ? {
          value: sort.value.value,
          set: sort.value.set,
          isActive: createMemo(() =>
            isSelectionActive(sort.value.value(), sort.catalog.defaultValue),
          ),
        }
      : undefined,
    view: views
      ? {
          value: views.value.value,
          set: views.value.set,
        }
      : undefined,
    search,
  };

  const selection = adapter.selectable
    ? createDataGridSelection(() => source().rows)
    : undefined;

  return {
    adapter,
    context,
    source,
    visibleColumns,
    selection,
  };
}
