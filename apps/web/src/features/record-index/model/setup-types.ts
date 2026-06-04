import type { Accessor } from "solid-js";

import type { RecordIndexFilterCatalog } from "./filter";
import type { RecordIndexSortCatalog } from "./sort";
import type { RecordIndexToolbarAction, RecordIndexViews } from "./types";

export type RecordIndexSetup = {
  id: string;
  title: Accessor<string>;
  ariaLabel: string;
  class?: string;
  selectable: boolean;
  columns: ReadonlyArray<{
    key: string;
    label: string;
  }>;
  views?: RecordIndexViews;
  actions?: ReadonlyArray<RecordIndexToolbarAction>;
  filter?: RecordIndexFilterCatalog;
  sort?: RecordIndexSortCatalog;
};
