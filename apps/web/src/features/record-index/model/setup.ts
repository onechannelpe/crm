import type { RecordIndexAdapter, RecordIndexSetup } from "./types";

export function createRecordIndexSetup<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(adapter: RecordIndexAdapter<T, TFilterValue, TSortValue>): RecordIndexSetup {
  return {
    id: adapter.id,
    title: adapter.title,
    ariaLabel: adapter.ariaLabel,
    class: adapter.class,
    pickerIcon: adapter.pickerIcon,
    selectable: adapter.selectable ?? false,
    emptyState: adapter.emptyState,
    createAction: adapter.createAction,
    toolbarActions: adapter.toolbarActions,
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
