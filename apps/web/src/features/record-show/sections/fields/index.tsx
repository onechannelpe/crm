import Checkbox from "~/components/icons/checkbox";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import { RecordChip } from "~/components/ui/record-chip/record-chip";
import type { LeadDetailView } from "~/contracts/workflow/views";
import type { CommercialScopeBinding } from "~/features/record-show/model/record-context";
import {
  FieldTable,
  FieldTextValue,
  RecordInlineCell,
} from "~/features/side-panel/components/field-table";
import {
  RecordDetailSection,
  RecordDetailSectionBody,
} from "~/features/side-panel/components/record-detail-section";
import { ExecutivePicker } from "~/features/workflow/detail/actions/executive-picker";
import { CommercialScopeFields } from "~/features/workflow/forms/commercial-scope/fields";
import { leadStageLabel } from "~/features/workflow/presentation/lead-display";
import { capitalize } from "~/lib/utils";

import { CommercialFields } from "./commercial-fields";
import { RegistrySection } from "./registry-section";

function ManagedByRow(props: { data: LeadDetailView }) {
  const canEdit = () => props.data.availableActions.includes("reassign-lead");

  return (
    <RecordInlineCell
      label="Administrado por"
      icon={User}
      edit={
        canEdit()
          ? {
              ariaLabel: "Editar Administrado por",
              renderEditor: (onClose) => (
                <ExecutivePicker
                  leadId={props.data.lead.id}
                  currentUserId={props.data.lead.executiveId}
                  onSelect={onClose}
                  onClose={onClose}
                />
              ),
            }
          : undefined
      }
    >
      <RecordChip name={props.data.lead.executiveName} shape="round" />
    </RecordInlineCell>
  );
}

function PriorityRow(props: { data: LeadDetailView }) {
  return (
    <RecordInlineCell
      label="Prioridad"
      icon={Checkbox}
      empty={props.data.lead.priority === null}
    >
      <FieldTextValue>
        {props.data.lead.priority && capitalize(props.data.lead.priority)}
      </FieldTextValue>
    </RecordInlineCell>
  );
}

// The Datos view is Twenty's Fields widget: one short, flat property box of the
// deal's own working attributes, then the registry (reference data) collapsed
// below. Stage lives in the header Tag, the pending step in Tareas, and audit
// metadata (updated by/at) is dropped — none of them belong in the field list.
export function DetailFieldsSection(props: { data: LeadDetailView }) {
  return (
    <RecordDetailSection>
      <RecordDetailSectionBody>
        <FieldTable>
          <CommercialFields data={props.data} />
          <PriorityRow data={props.data} />
          <ManagedByRow data={props.data} />
        </FieldTable>
        <RegistrySection data={props.data} />
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}

export function CreateFieldsSection(props: {
  commercialScope: CommercialScopeBinding;
}) {
  return (
    <RecordDetailSection>
      <RecordDetailSectionBody>
        <FieldTable>
          <CommercialScopeFields
            values={props.commercialScope.values}
            onChange={props.commercialScope.setField}
          />
          <RecordInlineCell label="Ejecutivo asignado" icon={User}>
            <FieldTextValue>Actual</FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell label="Etapa inicial" icon={Package}>
            <FieldTextValue>{leadStageLabel("QUALIFYING")}</FieldTextValue>
          </RecordInlineCell>
        </FieldTable>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}
