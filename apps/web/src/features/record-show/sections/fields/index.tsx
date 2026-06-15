import { createSignal, For } from "solid-js";
import type { JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";
import ChevronDown from "~/components/icons/chevron-down";
import MapIcon from "~/components/icons/map";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
import { TextInput } from "~/components/ui/input/text-input";
import type { LeadDetailView } from "~/contracts/workflow/views";
import type { CommercialScopeBinding } from "~/features/record-show/model/record-context";
import {
  FieldInputValue,
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
import { CommercialScopeFields } from "~/features/workflow/forms/commercial-scope/fields";
import { leadStageLabel } from "~/features/workflow/presentation/lead-display";

type FieldIcon = (props: { size?: number }) => JSX.Element;

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

function EditableFieldRow(props: {
  label: string;
  icon: FieldIcon;
  value: string;
  placeholder: string;
  onInput: (value: string) => void;
}) {
  return (
    <FieldRow label={props.label} icon={props.icon}>
      <FieldValue>
        <FieldInputValue>
          <TextInput
            sizeVariant="sm"
            value={props.value}
            onChange={props.onInput}
            placeholder={props.placeholder}
            aria-label={props.label}
          />
        </FieldInputValue>
      </FieldValue>
    </FieldRow>
  );
}

function ReadonlyFieldRow(props: {
  label: string;
  icon: FieldIcon;
  value: string;
}) {
  return (
    <FieldRow label={props.label} icon={props.icon} readonly>
      <FieldValue>
        <FieldValueDisplay>
          <FieldTextValue>{props.value}</FieldTextValue>
        </FieldValueDisplay>
      </FieldValue>
    </FieldRow>
  );
}

export function CreateFieldsSection(props: {
  razonSocial: string;
  address: string;
  onRazonSocialInput: (value: string) => void;
  onAddressInput: (value: string) => void;
  commercialScope: CommercialScopeBinding;
}) {
  return (
    <FieldsSectionFrame>
      <FieldTable>
        <EditableFieldRow
          label="Razón social"
          icon={Building2}
          value={props.razonSocial}
          placeholder="Razón social (SUNAT)"
          onInput={props.onRazonSocialInput}
        />
        <EditableFieldRow
          label="Dirección"
          icon={MapIcon}
          value={props.address}
          placeholder="Dirección (SUNAT)"
          onInput={props.onAddressInput}
        />
        <CommercialScopeFields
          values={props.commercialScope.values}
          onChange={props.commercialScope.setField}
        />
        <ReadonlyFieldRow
          label="Ejecutivo asignado"
          icon={User}
          value="Actual"
        />
        <ReadonlyFieldRow
          label="Etapa inicial"
          icon={Package}
          value={leadStageLabel("QUALIFYING")}
        />
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
