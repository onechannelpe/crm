import { For } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
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

import { FIELD_ROWS } from "../../constants";

type LeadCreateFieldsWidgetProps = {
  razonSocial?: string | null;
  address?: string | null;
};

export function FieldsWidget(props: LeadCreateFieldsWidgetProps) {
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
              <FieldValue>
                <FieldTextValue>
                  {field.key === "razonSocial"
                    ? (props.razonSocial ?? "")
                    : field.key === "address"
                      ? (props.address ?? "")
                      : (field.value ?? "")}
                </FieldTextValue>
              </FieldValue>
            </FieldRow>
          )}
        </For>
      </FieldTable>
    </Widget>
  );
}
