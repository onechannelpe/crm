import { Show } from "solid-js";

import { blockingFieldLabel } from "~/features/pipeline/detail/lead-workflow-ui";
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
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

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
