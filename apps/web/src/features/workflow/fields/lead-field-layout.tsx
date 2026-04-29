import { Show } from "solid-js";
import type { JSX } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Clock from "~/components/icons/calendar-clock";
import Checkbox from "~/components/icons/checkbox";
import MapIcon from "~/components/icons/map";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import { RecordInlineCell, RelationFieldRow } from "~/components/ui/field-row";
import { RecordChip } from "~/components/ui/record-chip/record-chip";
import { FieldChipList } from "~/features/side-panel/components/field-chip-list";
import { FieldTextValue } from "~/features/side-panel/components/field-table";
import { ExecutivePicker } from "~/features/workflow/detail/actions/executive-picker";
import {
  leadNextStepLabel,
  leadPriorityLabel,
  leadStageLabel,
  leadStatusLabel,
} from "~/features/workflow/presentation/lead-display";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";

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
    <RelationFieldRow
      label="Administrado por"
      icon={User}
      value={props.data.lead.executiveName}
      isEditable={canEdit()}
      renderValue={() => (
        <RecordChip name={props.data.lead.executiveName} shape="round" />
      )}
      renderPicker={(onClose) => (
        <ExecutivePicker
          leadId={props.data.lead.id}
          currentUserId={props.data.lead.executiveId}
          onSelect={onClose}
          onClose={onClose}
        />
      )}
    />
  );
}

export const LEAD_DETAIL_FIELD_GROUPS: FieldGroup[] = [
  {
    key: "empresa",
    label: "Empresa",
    fields: [
      {
        key: "ruc",
        label: "RUC",
        renderCell: (data) => (
          <RecordInlineCell label="RUC" icon={MapIcon}>
            <FieldTextValue>{data.lead.ruc}</FieldTextValue>
          </RecordInlineCell>
        ),
      },
      {
        key: "razonSocial",
        label: "Razón social",
        renderCell: (data) => (
          <RecordInlineCell label="Razón social" icon={Building2}>
            <FieldTextValue>{data.lead.razonSocial ?? ""}</FieldTextValue>
          </RecordInlineCell>
        ),
      },
      {
        key: "economicActivities",
        label: "Actividades",
        renderCell: (data) => (
          <RecordInlineCell label="Actividades" icon={Building2}>
            <FieldChipList
              emptyLabel="—"
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
          <RecordInlineCell label="Estado" icon={Package}>
            <FieldTextValue>{leadStatusLabel(data.lead.status)}</FieldTextValue>
          </RecordInlineCell>
        ),
      },
      {
        key: "prioridad",
        label: "Prioridad",
        renderCell: (data) => (
          <RecordInlineCell label="Prioridad" icon={Checkbox}>
            <FieldTextValue>
              {leadPriorityLabel(data.lead.prioridad)}
            </FieldTextValue>
          </RecordInlineCell>
        ),
      },
      {
        key: "stage",
        label: "Etapa",
        renderCell: (data) => (
          <RecordInlineCell label="Etapa" icon={Package}>
            <FieldTextValue>{leadStageLabel(data.lead.stage)}</FieldTextValue>
          </RecordInlineCell>
        ),
      },
      {
        key: "nextStep",
        label: "Siguiente paso",
        renderCell: (data) => (
          <RecordInlineCell label="Siguiente paso" icon={User}>
            <FieldTextValue>
              {leadNextStepLabel(data.lead.nextStep)}
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
          <RecordInlineCell label="Actualizado por" icon={User}>
            <Show
              when={data.lead.updatedByName}
              keyed
              fallback={<FieldTextValue>—</FieldTextValue>}
            >
              {(name) => <RecordChip name={name} shape="round" />}
            </Show>
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
