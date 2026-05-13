import { Show } from "solid-js";

import {
  RelationList,
  RelationMeta,
  RelationRow,
} from "~/features/side-panel/components/relation-list";
import {
  Widget,
  WidgetBody,
  WidgetHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import { blockingFieldLabel } from "~/features/workflow/detail/actions/workflow-ui";
import type { LeadDetailView } from "~/contracts/workflow";

import { formatAmount, formatRate } from "./format";

export function WorkflowWidget(props: { data: LeadDetailView }) {
  const negotiationCount = () => props.data.negotiationRequests.length;

  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Progreso comercial" />
      </WidgetHeader>
      <WidgetBody>
        <RelationList>
          <RelationRow>
            <span>Bloqueos</span>
            <RelationMeta>
              <Show
                when={props.data.blockingFields.length > 0}
                fallback="Ninguno"
              >
                {props.data.blockingFields
                  .map((field) => blockingFieldLabel(field))
                  .join(", ")}
              </Show>
            </RelationMeta>
          </RelationRow>
          <RelationRow>
            <span>Cotizaciones</span>
            <RelationMeta>
              {props.data.quotations.length === 0
                ? "Sin cotizaciones"
                : `${props.data.quotations.length} registradas`}
            </RelationMeta>
          </RelationRow>
          <Show when={negotiationCount() > 0}>
            <RelationRow>
              <span>Revisiones de tasa</span>
              <RelationMeta>Ronda {negotiationCount()} de 3</RelationMeta>
            </RelationRow>
          </Show>
          <Show when={props.data.profile}>
            {(profile) => (
              <>
                <RelationRow>
                  <span>GPV</span>
                  <RelationMeta>{formatAmount(profile().gpv)}</RelationMeta>
                </RelationRow>
                <RelationRow>
                  <span>Ticket</span>
                  <RelationMeta>{formatAmount(profile().ticket)}</RelationMeta>
                </RelationRow>
                <RelationRow>
                  <span>Tasa actual</span>
                  <RelationMeta>
                    {formatRate(profile().tasaActual)}
                  </RelationMeta>
                </RelationRow>
                <Show when={profile().proveedorActual}>
                  {(proveedor) => (
                    <RelationRow>
                      <span>Proveedor actual</span>
                      <RelationMeta>{proveedor()}</RelationMeta>
                    </RelationRow>
                  )}
                </Show>
              </>
            )}
          </Show>
          <Show when={props.data.lead.stage === "CLOSING"}>
            <RelationRow>
              <span>Siguiente paso</span>
              <RelationMeta>Completar cuentas en Sedes</RelationMeta>
            </RelationRow>
          </Show>
          <RelationRow>
            <span>Sedes</span>
            <RelationMeta>
              {props.data.venues.length === 0
                ? "Sin sedes"
                : `${props.data.venues.length} registradas`}
            </RelationMeta>
          </RelationRow>
        </RelationList>
      </WidgetBody>
    </Widget>
  );
}
