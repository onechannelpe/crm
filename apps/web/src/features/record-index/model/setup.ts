import type { RecordIndexSetup } from "./setup-types";
import type { RecordIndexAdapter } from "./types";

export function createRecordIndexSetup<
  T extends { id: string },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(adapter: RecordIndexAdapter<T, TFilterValue, TSortValue>): RecordIndexSetup {
  const rawTitle = adapter.title;
  const title = typeof rawTitle === "function" ? rawTitle : () => rawTitle;

  return {
    id: adapter.id,
    title,
    ariaLabel: adapter.ariaLabel,
    class: adapter.class,
    selectable: adapter.selectable ?? false,
    views: adapter.views,
    actions: adapter.actions,
    columns: adapter.columns.map((column) => ({
      key: column.key,
      label: column.label,
    })),
    // The filter/sort catalog is render-free and non-generic already, so the
    // setup view shares it by reference. Only the apply/isActive behavior is
    // erased (structurally invisible through the RecordIndex*Catalog type).
    filter: adapter.filter,
    sort: adapter.sort,
  };
}
