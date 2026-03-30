import type { JSX } from "solid-js";

import { DataGridEmptyState } from "~/features/data-grid";

export function RecordIndexEmptyState(props: { children: JSX.Element }) {
  return <DataGridEmptyState>{props.children}</DataGridEmptyState>;
}
