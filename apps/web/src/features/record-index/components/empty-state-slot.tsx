import type { JSX } from "solid-js";

import { DataGridEmptyState } from "~/features/data-grid/components/empty-state";

export function RecordIndexEmptyState(props: { children: JSX.Element }) {
  return <DataGridEmptyState>{props.children}</DataGridEmptyState>;
}
