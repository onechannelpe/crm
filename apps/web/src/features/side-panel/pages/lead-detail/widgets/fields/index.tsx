import { For } from "solid-js";
import type { JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import { FieldChipList } from "~/features/side-panel/components/field-chip-list";
import {
  FieldIcon,
  FieldLabel,
  FieldRow,
  FieldTable,
  FieldTextValue,
  FieldValue,
} from "~/features/side-panel/components/field-table";
import {
  Widget,
  WidgetHeader,
  WidgetSectionHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { FIELD_ROWS } from "../../constants";

type FieldKey = (typeof FIELD_ROWS)[number]["key"];

function renderTextField(data: LeadDetailView, key: FieldKey): string {
  if (key === "ruc") return data.lead.ruc;
  if (key === "razonSocial") return data.lead.razonSocial ?? "";
  if (key === "status") return data.lead.status ?? "";
  if (key === "prioridad") return data.lead.prioridad ?? "";
  if (key === "stage") return data.lead.stage;
  if (key === "nextStep") return data.lead.nextStep;
  if (key === "updatedAt") return formatDateTime(data.lead.updatedAt);
  return "";
}

function renderFieldValue(data: LeadDetailView, key: FieldKey): JSX.Element {
  if (key === "economicActivities") {
    return (
      <FieldChipList
        emptyLabel="—"
        items={data.sourceStatus.sunat.economicActivities.map((activity) => ({
          id: `${activity.role}-${activity.order ?? 0}-${activity.code}`,
          label: activity.code,
          tone: activity.role === "principal" ? "positive" : "neutral",
          tooltip: `${activity.label} - ${activity.description}`,
        }))}
      />
    );
  }

  return <FieldTextValue>{renderTextField(data, key)}</FieldTextValue>;
}

export function FieldsWidget(props: { data: LeadDetailView }) {
  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle>Campos</WidgetTitle>
      </WidgetHeader>
      <WidgetSectionHeader>
        <span>General</span>
        <ChevronDown size={14} />
      </WidgetSectionHeader>
      <FieldTable>
        <For each={FIELD_ROWS}>
          {(field) => (
            <FieldRow>
              <FieldLabel>
                <FieldIcon>
                  <field.icon size={16} />
                </FieldIcon>
                <span>{field.label}</span>
              </FieldLabel>
              <FieldValue>{renderFieldValue(props.data, field.key)}</FieldValue>
            </FieldRow>
          )}
        </For>
      </FieldTable>
    </Widget>
  );
}
