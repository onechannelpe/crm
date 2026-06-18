import { Show } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Checkbox from "~/components/icons/checkbox";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Target from "~/components/icons/target";
import type { LeadDetailView } from "~/contracts/workflow/views";
import {
  FieldTable,
  FieldTextValue,
  RecordInlineCell,
} from "~/features/side-panel/components/field-table";
import {
  RecordDetailSection,
  RecordDetailSectionBody,
  RecordDetailSectionHeader,
  RecordDetailSectionTitle,
} from "~/features/side-panel/components/record-detail-section";
import { blockingFieldLabel } from "~/features/workflow/detail/actions/workflow-ui";

import { formatAmount, formatRate } from "./format";

export function WorkflowProgressSection(props: { data: LeadDetailView }) {
  const revisionCount = () => props.data.rateRevisions.length;

  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Progreso comercial" />
      </RecordDetailSectionHeader>
      <RecordDetailSectionBody>
        <FieldTable>
          <RecordInlineCell label="Bloqueos" icon={Checkbox}>
            <FieldTextValue>
              <Show
                when={props.data.blockingFields.length > 0}
                fallback="Ninguno"
              >
                {props.data.blockingFields
                  .map((field) => blockingFieldLabel(field))
                  .join(", ")}
              </Show>
            </FieldTextValue>
          </RecordInlineCell>

          <RecordInlineCell label="Propuestas de tarifa" icon={Package}>
            <FieldTextValue>
              {props.data.rateProposals.length === 0
                ? "Sin propuestas"
                : `${props.data.rateProposals.length} registradas`}
            </FieldTextValue>
          </RecordInlineCell>

          <Show when={revisionCount() > 0}>
            <RecordInlineCell label="Revisiones de tarifa" icon={Target}>
              <FieldTextValue>Ronda {revisionCount()} de 3</FieldTextValue>
            </RecordInlineCell>
          </Show>

          <Show when={props.data.profile}>
            {(profile) => (
              <>
                <RecordInlineCell label="GPV" icon={Moneybag}>
                  <FieldTextValue>{formatAmount(profile().gpv)}</FieldTextValue>
                </RecordInlineCell>
                <RecordInlineCell label="Ticket" icon={Moneybag}>
                  <FieldTextValue>
                    {formatAmount(profile().ticket)}
                  </FieldTextValue>
                </RecordInlineCell>
                <RecordInlineCell label="Tasa débito actual" icon={Target}>
                  <FieldTextValue>
                    {formatRate(profile().tasaDebitoActual)}
                  </FieldTextValue>
                </RecordInlineCell>
                <RecordInlineCell label="Tasa crédito actual" icon={Target}>
                  <FieldTextValue>
                    {formatRate(profile().tasaCreditoActual)}
                  </FieldTextValue>
                </RecordInlineCell>
                <Show when={profile().proveedorActual}>
                  {(proveedor) => (
                    <RecordInlineCell label="Proveedor actual" icon={Building2}>
                      <FieldTextValue>{proveedor()}</FieldTextValue>
                    </RecordInlineCell>
                  )}
                </Show>
              </>
            )}
          </Show>

          <Show when={props.data.lead.stage === "SETUP"}>
            <RecordInlineCell label="Siguiente paso" icon={Package}>
              <FieldTextValue>Completar cuentas en Sedes</FieldTextValue>
            </RecordInlineCell>
          </Show>

          <RecordInlineCell label="Sedes" icon={Building2}>
            <FieldTextValue>
              {props.data.venues.length === 0
                ? "Sin sedes"
                : `${props.data.venues.length} registradas`}
            </FieldTextValue>
          </RecordInlineCell>
        </FieldTable>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}
