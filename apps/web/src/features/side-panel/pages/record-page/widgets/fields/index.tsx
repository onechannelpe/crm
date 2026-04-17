import { createSignal, For } from "solid-js";
import type { JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Clock from "~/components/icons/calendar-clock";
import ChevronDown from "~/components/icons/chevron-down";
import MapIcon from "~/components/icons/map";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
import { RelationFieldRow } from "~/components/ui/field-row";
import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import { ExecutivePicker } from "~/features/pipeline/detail/executive-picker";
import { FieldsWidget } from "~/features/pipeline/fields/fields-widget";
import {
  FieldIcon,
  FieldLabel,
  FieldLabelText,
  FieldRow,
  FieldTable,
  FieldTextValue,
  FieldValue,
} from "~/features/side-panel/components/field-table";
import {
  WidgetBody,
  Widget,
  WidgetHeader,
  WidgetSectionChevron,
  WidgetSectionHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

type IconComponent = (props: { size?: number }) => JSX.Element;

type LeadCreateFieldRow = {
  label: string;
  icon: IconComponent;
  key?: "razonSocial" | "address";
  value?: string;
};

const LEAD_CREATE_FIELD_ROWS: ReadonlyArray<LeadCreateFieldRow> = [
  { label: "Razón social", icon: Building2, key: "razonSocial" },
  { label: "Dirección", icon: MapIcon, key: "address" },
  { label: "Ejecutivo asignado", icon: User, value: "Actual" },
  {
    label: "Etapa inicial",
    icon: Package,
    value: "PENDING_EXTERNAL_REVIEW",
  },
  { label: "Última actualización", icon: Clock, value: "" },
] as const;

function WidgetFrame(props: { children: JSX.Element }) {
  const [isExpanded, setIsExpanded] = createSignal(true);

  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Campos" />
      </WidgetHeader>
      <WidgetBody>
        <WidgetSectionHeader
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span>General</span>
          <WidgetSectionChevron isExpanded={isExpanded()}>
            <ChevronDown size={14} />
          </WidgetSectionChevron>
        </WidgetSectionHeader>
        <AnimatedExpandableContainer isExpanded={isExpanded()}>
          {props.children}
        </AnimatedExpandableContainer>
      </WidgetBody>
    </Widget>
  );
}

export function CreateFieldsWidget(props: {
  razonSocial?: string | null;
  address?: string | null;
}) {
  const [hoveredFieldKey, setHoveredFieldKey] = createSignal<string | null>(
    null,
  );

  return (
    <WidgetFrame>
      <FieldTable>
        <For each={LEAD_CREATE_FIELD_ROWS}>
          {(field) => (
            <FieldRow
              readonly
              hovered={hoveredFieldKey() === (field.key ?? field.label)}
              onMouseEnter={() => setHoveredFieldKey(field.key ?? field.label)}
              onMouseLeave={() => setHoveredFieldKey(null)}
              onFocusIn={() => setHoveredFieldKey(field.key ?? field.label)}
              onFocusOut={() => setHoveredFieldKey(null)}
            >
              <FieldLabel>
                <FieldIcon>
                  <field.icon size={16} />
                </FieldIcon>
                <FieldLabelText>
                  <OverflowingText
                    text={field.label}
                    style={{ width: "100%" }}
                  />
                </FieldLabelText>
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
    </WidgetFrame>
  );
}

export function DetailFieldsWidget(props: { data: LeadDetailView }) {
  const canEditExecutive = () =>
    props.data.availableActions.includes("reassign-lead");

  return (
    <WidgetFrame>
      <FieldsWidget data={props.data} />
      <FieldTable>
        <RelationFieldRow
          label="Administrado por"
          icon={User}
          value={props.data.lead.executiveName}
          isEditable={canEditExecutive()}
          renderPicker={(onClose) => (
            <ExecutivePicker
              leadId={props.data.lead.id}
              currentUserId={props.data.lead.executiveId}
              onSelect={onClose}
              onClose={onClose}
            />
          )}
        />
        <RelationFieldRow
          label="Actualizado por"
          icon={User}
          value={props.data.lead.updatedByName ?? "—"}
        />
      </FieldTable>
    </WidgetFrame>
  );
}
