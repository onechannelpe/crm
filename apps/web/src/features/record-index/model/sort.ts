import type { DataGridIcon } from "~/features/data-grid/model/types";

import type { RecordIndexOption } from "./catalog";

export type RecordIndexSortField = {
  prefix: string;
  label: string;
  icon: DataGridIcon;
};

export type RecordIndexSortCatalog<TValue extends string = string> = {
  label: string;
  menuId: string;
  fields: ReadonlyArray<RecordIndexSortField>;
  options: ReadonlyArray<RecordIndexOption<TValue>>;
  defaultValue: TValue;
};

export type RecordIndexSortDefinition<
  T,
  TValue extends string = string,
> = RecordIndexSortCatalog<TValue> & {
  apply?: (rows: T[], value: TValue) => T[];
  isActive?: (value: TValue) => boolean;
};
