import type { DataGridIcon } from "~/features/data-grid/model/types";

import type { RecordIndexOption } from "./catalog";

export type RecordIndexFilterField<TValue extends string = string> = {
  id: string;
  label: string;
  icon: DataGridIcon;
  options: ReadonlyArray<RecordIndexOption<TValue>>;
};

export type RecordIndexFilterCatalog<TValue extends string = string> = {
  label: string;
  menuId: string;
  defaultValue: TValue;
  fields: ReadonlyArray<RecordIndexFilterField<TValue>>;
};

export type RecordIndexFilterDefinition<
  T,
  TValue extends string = string,
> = RecordIndexFilterCatalog<TValue> & {
  apply?: (rows: T[], value: TValue) => T[];
  isActive?: (value: TValue) => boolean;
};
