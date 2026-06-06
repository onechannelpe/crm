import type { Accessor, Setter } from "solid-js";

import type { DataGridSelectionModel } from "~/features/data-grid/hooks/use-selection";
import type { DataGridColumn } from "~/features/data-grid/model/types";

import type {
  RecordIndexAdapter,
  RecordIndexSearchControl,
  RecordIndexSource,
} from "./adapter";
import type { RecordIndexFilterPanel, RecordIndexMenu } from "./view-state";

// RecordIndexModel is the non-generic view-bar contract. Optional slices exist
// only when the adapter provides them.
export type RecordIndexModel = {
  counts: {
    pickerMeta: Accessor<string>;
    total: Accessor<number | undefined>;
    visible: Accessor<number>;
  };
  columns: {
    openMenu: Accessor<RecordIndexMenu>;
    setOpenMenu: Setter<RecordIndexMenu>;
    visibleColumnKeys: Accessor<Set<string>>;
    hasHiddenColumns: Accessor<boolean>;
    toggleColumn: (key: string) => void;
  };
  filtering?: {
    value: Accessor<string | undefined>;
    set: (value: string | undefined) => void;
    isActive: Accessor<boolean>;
    panel: Accessor<RecordIndexFilterPanel>;
    setPanel: Setter<RecordIndexFilterPanel>;
  };
  sorting?: {
    value: Accessor<string | undefined>;
    set: (value: string | undefined) => void;
    isActive: Accessor<boolean>;
  };
  view?: {
    value: Accessor<string>;
    set: (id: string) => void;
  };
  search?: RecordIndexSearchControl;
};

// The table surface keeps typed adapter data while sharing the view-bar model.
export type RecordIndexScreenModel<T extends { id: string }> = {
  adapter: RecordIndexAdapter<T>;
  context: RecordIndexModel;
  source: Accessor<RecordIndexSource<T>>;
  visibleColumns: Accessor<DataGridColumn<T>[]>;
  selection?: DataGridSelectionModel;
};
