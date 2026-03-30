export type RecordIndexSortOption<TValue extends string = string> = {
  label: string;
  value: TValue;
};

export type RecordIndexSortDefinition<T, TValue extends string = string> = {
  label: string;
  menuId: string;
  options: ReadonlyArray<RecordIndexSortOption<TValue>>;
  defaultValue: TValue;
  apply: (rows: T[], value: TValue) => T[];
  isActive?: (value: TValue) => boolean;
};
