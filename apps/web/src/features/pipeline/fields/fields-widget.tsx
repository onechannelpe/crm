import { For } from "solid-js";

import { FieldTable } from "~/features/side-panel/components/field-table";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { LEAD_DETAIL_FIELD_LAYOUT } from "./lead-field-layout";

export function FieldsWidget(props: { data: LeadDetailView }) {
  return (
    <FieldTable>
      <For each={LEAD_DETAIL_FIELD_LAYOUT}>
        {(config) => config.renderCell(props.data)}
      </For>
    </FieldTable>
  );
}
