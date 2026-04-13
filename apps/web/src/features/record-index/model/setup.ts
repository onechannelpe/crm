import type { RecordIndexAdapter, RecordIndexSetup } from "./types";

export function createRecordIndexSetup<
  T extends { id: number },
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
    exportAction: adapter.exportAction,
    columns: adapter.columns.map((column) => ({
      key: column.key,
      label: column.label,
    })),
    filter: adapter.filter
      ? {
          label: adapter.filter.label,
          menuId: adapter.filter.menuId,
          defaultValue: adapter.filter.defaultValue,
          options: adapter.filter.options.map((option) => ({
            label: option.label,
            value: option.value,
          })),
        }
      : undefined,
    sort: adapter.sort
      ? {
          label: adapter.sort.label,
          menuId: adapter.sort.menuId,
          defaultValue: adapter.sort.defaultValue,
          options: adapter.sort.options.map((option) => ({
            label: option.label,
            value: option.value,
          })),
        }
      : undefined,
  };
}
