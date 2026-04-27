import { Show } from "solid-js";

import {
  RelationList,
  RelationMeta,
  RelationRow,
} from "~/features/side-panel/components/relation-list";
import {
  WidgetBody,
  Widget,
  WidgetHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import { blockingFieldLabel } from "~/features/workflow/detail/lead-workflow-ui";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";

import { formatAmount, formatRate } from "./format";

export function WorkflowWidget(props: { data: LeadDetailView }) {
  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Flujo de trabajo" />
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
          <Show when={props.data.commercialInput}>
            {(input) => (
              <>
                <RelationRow>
                  <span>GPV</span>
                  <RelationMeta>{formatAmount(input().gpv)}</RelationMeta>
                </RelationRow>
                <RelationRow>
                  <span>Ticket</span>
                  <RelationMeta>{formatAmount(input().ticket)}</RelationMeta>
                </RelationRow>
                <RelationRow>
                  <span>Tasa actual</span>
                  <RelationMeta>{formatRate(input().tasaActual)}</RelationMeta>
                </RelationRow>
              </>
            )}
          </Show>
          <RelationRow>
            <span>Venta</span>
            <RelationMeta>
              {props.data.sale ? `Venta #${props.data.sale.id}` : "Pendiente"}
            </RelationMeta>
          </RelationRow>
        </RelationList>
      </WidgetBody>
    </Widget>
  );
}
