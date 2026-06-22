import type { JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Clock from "~/components/icons/calendar-clock";
import Checkbox from "~/components/icons/checkbox";
import MapIcon from "~/components/icons/map";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import { RecordChip } from "~/components/ui/record-chip/record-chip";
import type { LeadDetailView } from "~/contracts/workflow/views";
import { FieldChipList } from "~/features/side-panel/components/field-chip-list";
import {
  FieldTextValue,
  RecordInlineCell,
} from "~/features/side-panel/components/field-table";
import { ExecutivePicker } from "~/features/workflow/detail/actions/executive-picker";
import { capitalize, formatDateTime } from "~/lib/utils";

export type FieldConfig = {
  key: string;
  label: string;
  renderCell: (data: LeadDetailView) => JSX.Element;
};

export type FieldGroup = {
  key: string;
  label: string;
  fields: FieldConfig[];
};

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

// Registration identity first (what the lead is), then qualification status, then
// administrative metadata last. Stage and next step are owned by the stepper, so
// they are intentionally absent here.
export const LEAD_DETAIL_FIELD_GROUPS: FieldGroup[] = [
  {
    key: "sunat",
    label: "Datos de registro",
    fields: [
      {
        key: "address",
        label: "Dirección",
        renderCell: (data) => (
          <RecordInlineCell
            label="Dirección"
            icon={MapIcon}
            empty={!data.lead.address}
          >
            <FieldTextValue>{data.lead.address}</FieldTextValue>
          </RecordInlineCell>
        ),
      },
      {
        key: "contributorStatus",
        label: "Estado del contribuyente",
        renderCell: (data) => (
          <RecordInlineCell
            label="Estado del contribuyente"
            icon={Building2}
            empty={!data.sourceStatus.sunat.contributorStatus}
          >
            <FieldTextValue>
              {data.sourceStatus.sunat.contributorStatus}
            </FieldTextValue>
          </RecordInlineCell>
        ),
      },
      {
        key: "contributorCondition",
        label: "Condición",
        renderCell: (data) => (
          <RecordInlineCell
            label="Condición"
            icon={Checkbox}
            empty={!data.sourceStatus.sunat.contributorCondition}
          >
            <FieldTextValue>
              {data.sourceStatus.sunat.contributorCondition}
            </FieldTextValue>
          </RecordInlineCell>
        ),
      },
      {
        key: "economicActivities",
        label: "Actividades económicas",
        renderCell: (data) => (
          <RecordInlineCell
            label="Actividades económicas"
            icon={Package}
            empty={data.sourceStatus.sunat.economicActivities.length === 0}
          >
            <FieldChipList
              items={data.sourceStatus.sunat.economicActivities.map(
                (activity) => ({
                  id: `${activity.role}-${activity.order ?? 0}-${activity.code}`,
                  label: activity.code,
                  tone: activity.role === "principal" ? "positive" : "neutral",
                  tooltip: `${activity.label} - ${activity.description}`,
                }),
              )}
            />
          </RecordInlineCell>
        ),
      },
    ],
  },
  {
    key: "estado",
    label: "Estado",
    fields: [
      {
        key: "status",
        label: "Estado",
        renderCell: (data) => (
          <RecordInlineCell
            label="Estado"
            icon={Package}
            empty={data.lead.status === null}
          >
            <FieldTextValue>
              {data.lead.status && capitalize(data.lead.status)}
            </FieldTextValue>
          </RecordInlineCell>
        ),
      },
      {
        key: "priority",
        label: "Prioridad",
        renderCell: (data) => (
          <RecordInlineCell
            label="Prioridad"
            icon={Checkbox}
            empty={data.lead.priority === null}
          >
            <FieldTextValue>
              {data.lead.priority && capitalize(data.lead.priority)}
            </FieldTextValue>
          </RecordInlineCell>
        ),
      },
    ],
  },
  {
    key: "administracion",
    label: "Administración",
    fields: [
      {
        key: "managedBy",
        label: "Administrado por",
        renderCell: (data) => <ManagedByRow data={data} />,
      },
      {
        key: "updatedBy",
        label: "Actualizado por",
        renderCell: (data) => (
          <RecordInlineCell
            label="Actualizado por"
            icon={User}
            empty={!data.lead.updatedByName}
          >
            <RecordChip name={data.lead.updatedByName ?? ""} shape="round" />
          </RecordInlineCell>
        ),
      },
      {
        key: "updatedAt",
        label: "Actualizado",
        renderCell: (data) => (
          <RecordInlineCell label="Actualizado" icon={Clock}>
            <FieldTextValue>
              {formatDateTime(data.lead.updatedAt)}
            </FieldTextValue>
          </RecordInlineCell>
        ),
      },
    ],
  },
];
