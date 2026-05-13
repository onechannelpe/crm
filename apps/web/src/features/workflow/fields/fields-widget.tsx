import { For } from "solid-js";

import { FieldTable } from "~/features/side-panel/components/field-table";
import type { LeadDetailView } from "~/contracts/workflow";

import { LEAD_DETAIL_FIELD_GROUPS } from "./lead-field-layout";

const ALL_FIELDS = LEAD_DETAIL_FIELD_GROUPS.flatMap((g) => g.fields);

export function FieldsWidget(props: { data: LeadDetailView }) {
  return (
    <FieldTable>
      <For each={ALL_FIELDS}>{(config) => config.renderCell(props.data)}</For>
    </FieldTable>
  );
}
