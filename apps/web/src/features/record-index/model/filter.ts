export type RecordIndexFilterOption<TValue extends string = string> = {
  label: string;
  value: TValue;
};

export type RecordIndexFilterDefinition<T, TValue extends string = string> = {
  label: string;
  menuId: string;
  options: ReadonlyArray<RecordIndexFilterOption<TValue>>;
  defaultValue: TValue;
  apply: (rows: T[], value: TValue) => T[];
  isActive?: (value: TValue) => boolean;
};
