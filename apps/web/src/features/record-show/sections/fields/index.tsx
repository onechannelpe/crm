import { createSignal, For } from "solid-js";
import type { JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Clock from "~/components/icons/calendar-clock";
import ChevronDown from "~/components/icons/chevron-down";
import MapIcon from "~/components/icons/map";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
import type { LeadDetailView } from "~/contracts/workflow/views";
import {
  FieldRow,
  FieldTable,
  FieldTextValue,
  FieldValue,
  FieldValueDisplay,
} from "~/features/side-panel/components/field-table";
import {
  RecordDetailSection,
  RecordDetailSectionBody,
  RecordDetailSectionHeader,
  RecordDetailSubsectionChevron,
  RecordDetailSubsectionHeader,
  RecordDetailSectionTitle,
} from "~/features/side-panel/components/record-detail-section";
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

function FieldsSectionFrame(props: { children: JSX.Element }) {
  const [isExpanded, setIsExpanded] = createSignal(true);

  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Campos" />
      </RecordDetailSectionHeader>
      <RecordDetailSectionBody>
        <RecordDetailSubsectionHeader
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span>General</span>
          <RecordDetailSubsectionChevron isExpanded={isExpanded()}>
            <ChevronDown size={14} />
          </RecordDetailSubsectionChevron>
        </RecordDetailSubsectionHeader>
        <AnimatedExpandableContainer isExpanded={isExpanded()}>
          {props.children}
        </AnimatedExpandableContainer>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}

export function CreateFieldsSection(props: {
  razonSocial?: string | null;
  address?: string | null;
}) {
  const [hoveredFieldKey, setHoveredFieldKey] = createSignal<string | null>(
    null,
  );

  return (
    <FieldsSectionFrame>
      <FieldTable>
        <For each={LEAD_CREATE_FIELD_ROWS}>
          {(field) => (
            <FieldRow
              label={field.label}
              icon={field.icon}
              readonly
              hovered={hoveredFieldKey() === (field.key ?? field.label)}
              onMouseEnter={() => setHoveredFieldKey(field.key ?? field.label)}
              onMouseLeave={() => setHoveredFieldKey(null)}
              onFocusIn={() => setHoveredFieldKey(field.key ?? field.label)}
              onFocusOut={() => setHoveredFieldKey(null)}
            >
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
    </FieldsSectionFrame>
  );
}

function FieldGroupSection(props: { group: FieldGroup; data: LeadDetailView }) {
  const [isExpanded, setIsExpanded] = createSignal(true);

  return (
    <>
      <RecordDetailSubsectionHeader onClick={() => setIsExpanded((v) => !v)}>
        <span>{props.group.label}</span>
        <RecordDetailSubsectionChevron isExpanded={isExpanded()}>
          <ChevronDown size={14} />
        </RecordDetailSubsectionChevron>
      </RecordDetailSubsectionHeader>
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

export function DetailFieldsSection(props: { data: LeadDetailView }) {
  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Campos" />
      </RecordDetailSectionHeader>
      <RecordDetailSectionBody>
        <For each={LEAD_DETAIL_FIELD_GROUPS}>
          {(group) => <FieldGroupSection group={group} data={props.data} />}
        </For>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}
