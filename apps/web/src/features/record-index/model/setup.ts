import type { Accessor } from "solid-js";

import type { RecordIndexAdapter, RecordIndexToolbarAction } from "./adapter";
import type {
  RecordIndexFilterCatalog,
  RecordIndexSortCatalog,
  RecordIndexViews,
} from "./catalog";

export type RecordIndexSetupColumn = {
  key: string;
  label: string;
};

export type RecordIndexSetup = {
  id: string;
  title: Accessor<string>;
  ariaLabel: string;
  class?: string;
  selectable: boolean;
  columns: ReadonlyArray<RecordIndexSetupColumn>;
  filter?: RecordIndexFilterCatalog;
  sort?: RecordIndexSortCatalog;
  views?: RecordIndexViews;
  actions?: ReadonlyArray<RecordIndexToolbarAction>;
};

export function createRecordIndexSetup<T extends { id: string }>(
  adapter: RecordIndexAdapter<T>,
): RecordIndexSetup {
  const rawTitle = adapter.title;
  const title = typeof rawTitle === "function" ? rawTitle : () => rawTitle;

  return {
    id: adapter.id,
    title,
    ariaLabel: adapter.ariaLabel,
    class: adapter.class,
    selectable: adapter.selectable ?? false,
    columns: adapter.columns.map((column) => ({
      key: column.key,
      label: column.label,
    })),
    filter: adapter.filter?.catalog,
    sort: adapter.sort?.catalog,
    views: adapter.views?.catalog,
    actions: adapter.actions,
  };
}
