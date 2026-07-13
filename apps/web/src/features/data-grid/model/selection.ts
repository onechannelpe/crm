import type { Accessor } from "solid-js";

export type DataGridSelectionController = {
  selectedIds: Accessor<ReadonlySet<string>>;
  allSelected: Accessor<boolean>;
  someSelected: Accessor<boolean>;
  isSelected: (id: string) => boolean;
  clear: () => void;
  setSelected: (id: string, checked: boolean) => void;
  replace: (ids: Iterable<string>) => void;
  toggleAll: (checked: boolean) => void;
};
