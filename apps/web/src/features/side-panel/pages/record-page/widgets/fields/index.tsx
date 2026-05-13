import { createSignal, For } from "solid-js";
import type { JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Clock from "~/components/icons/calendar-clock";
import ChevronDown from "~/components/icons/chevron-down";
import MapIcon from "~/components/icons/map";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import type { LeadDetailView } from "~/contracts/workflow";
import {
  FieldIcon,
  FieldLabel,
  FieldLabelText,
  FieldRow,
  FieldTable,
  FieldTextValue,
  FieldValue,
  FieldValueDisplay,
} from "~/features/side-panel/components/field-table";
import {
  Widget,
  WidgetBody,
  WidgetHeader,
  WidgetSectionChevron,
  WidgetSectionHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import {
  LEAD_DETAIL_FIELD_GROUPS,
  type FieldGroup,
} from "~/features/workflow/fields/lead-field-layout";
import { leadStageLabel } from "~/features/workflow/presentation/lead-display";

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
    value: leadStageLabel("QUALIFYING"),
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
                <FieldValueDisplay>
                  <FieldTextValue>
                    {field.key === "razonSocial"
                      ? (props.razonSocial ?? "")
                      : field.key === "address"
                        ? (props.address ?? "")
                        : (field.value ?? "")}
                  </FieldTextValue>
                </FieldValueDisplay>
              </FieldValue>
            </FieldRow>
          )}
        </For>
      </FieldTable>
    </WidgetFrame>
  );
}

function FieldGroupSection(props: { group: FieldGroup; data: LeadDetailView }) {
  const [isExpanded, setIsExpanded] = createSignal(true);

  return (
    <>
      <WidgetSectionHeader onClick={() => setIsExpanded((v) => !v)}>
        <span>{props.group.label}</span>
        <WidgetSectionChevron isExpanded={isExpanded()}>
          <ChevronDown size={14} />
        </WidgetSectionChevron>
      </WidgetSectionHeader>
      <AnimatedExpandableContainer isExpanded={isExpanded()}>
        <FieldTable>
          <For each={props.group.fields}>
            {(field) => field.renderCell(props.data)}
          </For>
        </FieldTable>
      </AnimatedExpandableContainer>
    </>
  );
}

export function DetailFieldsWidget(props: { data: LeadDetailView }) {
  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Campos" />
      </WidgetHeader>
      <WidgetBody>
        <For each={LEAD_DETAIL_FIELD_GROUPS}>
          {(group) => <FieldGroupSection group={group} data={props.data} />}
        </For>
      </WidgetBody>
    </Widget>
  );
}
