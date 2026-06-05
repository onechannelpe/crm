import type { DataGridIcon } from "~/features/data-grid/model/types";

export type RecordIndexOption<TValue extends string = string> = {
  label: string;
  value: TValue;
};

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

export type RecordIndexSortField = {
  prefix: string;
  label: string;
  icon: DataGridIcon;
};

export type RecordIndexSortCatalog<TValue extends string = string> = {
  label: string;
  menuId: string;
  defaultValue: TValue;
  fields: ReadonlyArray<RecordIndexSortField>;
  options: ReadonlyArray<RecordIndexOption<TValue>>;
};

export type RecordIndexViewDefinition = {
  readonly id: string;
  readonly label: string;
};

// Adapter-declared catalog: which views exist and which is the default. The
// active selection is a live control owned by the adapter, not part of this
// static catalog.
export type RecordIndexViews = {
  readonly available: ReadonlyArray<RecordIndexViewDefinition>;
  readonly defaultId: string;
};
