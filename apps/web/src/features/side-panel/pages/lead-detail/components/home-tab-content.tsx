import { A } from "@solidjs/router";
import { For, Show } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import ChevronRight from "~/components/icons/chevron-right";
import {
  blockingFieldLabel,
  mapLeadActionsToUi,
} from "~/features/pipeline/detail/lead-workflow-ui";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { FIELD_ROWS } from "./constants";

import styles from "../page.module.css";

type HomeTabContentProps = {
  data: LeadDetailView;
  approving?: boolean;
  onApproveForSale?: () => void;
};

function actionItems(data: LeadDetailView) {
  return mapLeadActionsToUi(data.lead.id, data.availableActions);
}

function fieldValue(props: {
  data: LeadDetailView;
  key: (typeof FIELD_ROWS)[number]["key"];
}) {
  if (props.key === "ruc") return props.data.lead.ruc;
  if (props.key === "razonSocial") return props.data.lead.razonSocial ?? "";
  if (props.key === "status") return props.data.lead.status ?? "";
  if (props.key === "prioridad") return props.data.lead.prioridad ?? "";
  if (props.key === "stage") return props.data.lead.stage;
  if (props.key === "nextStep") return props.data.lead.nextStep;
  return formatDateTime(props.data.lead.updatedAt);
}

export function HomeTabContent(props: HomeTabContentProps) {
  const actions = () => actionItems(props.data);

  return (
    <div class={styles.homeContent}>
      <section class={styles.widget}>
        <div class={styles.widgetHeader}>
          <h3 class={styles.widgetTitle}>Campos</h3>
        </div>
        <button type="button" class={styles.sectionHeader}>
          <span>General</span>
          <ChevronDown size={14} />
        </button>

        <div class={styles.fieldTable}>
          <For each={FIELD_ROWS}>
            {(field) => (
              <div class={styles.fieldRow}>
                <div class={styles.fieldLabel}>
                  <div class={styles.fieldIcon}>
                    <field.icon size={16} />
                  </div>
                  <span>{field.label}</span>
                </div>
                <div class={styles.fieldValue}>
                  <span class={styles.fieldTextValue}>
                    {fieldValue({ data: props.data, key: field.key })}
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>
      </section>

      <section class={styles.widget}>
        <div class={styles.widgetHeader}>
          <h3 class={styles.widgetTitle}>Flujo de trabajo</h3>
        </div>
        <div class={styles.relationList}>
          <div class={styles.relationRow}>
            <span>Bloqueos</span>
            <span class={styles.relationMeta}>
              <Show
                when={props.data.blockingFields.length > 0}
                fallback="Ninguno"
              >
                {props.data.blockingFields
                  .map((field) => blockingFieldLabel(field))
                  .join(", ")}
              </Show>
            </span>
          </div>
          <div class={styles.relationRow}>
            <span>Cotizaciones</span>
            <span class={styles.relationMeta}>
              {props.data.quotations.length === 0
                ? "Sin cotizaciones"
                : `${props.data.quotations.length} registradas`}
            </span>
          </div>
          <div class={styles.relationRow}>
            <span>Venta</span>
            <span class={styles.relationMeta}>
              {props.data.sale ? `Venta #${props.data.sale.id}` : "Pendiente"}
            </span>
          </div>
        </div>
      </section>

      <section class={styles.widget}>
        <div class={styles.widgetHeader}>
          <h3 class={styles.widgetTitle}>Acciones</h3>
        </div>
        <div class={styles.relationList}>
          <For each={actions()}>
            {(action) => (
              <Show
                when={action.kind === "link" && action}
                fallback={
                  <button
                    type="button"
                    class={styles.actionRowButton}
                    disabled={props.approving}
                    onClick={() => props.onApproveForSale?.()}
                  >
                    <span>
                      {props.approving ? "Aprobando..." : action.label}
                    </span>
                    <ChevronRight size={14} />
                  </button>
                }
              >
                {(linkAction) => (
                  <A class={styles.actionRowLink} href={linkAction().href}>
                    <span>{linkAction().label}</span>
                    <ChevronRight size={14} />
                  </A>
                )}
              </Show>
            )}
          </For>
          <Show when={actions().length === 0}>
            <div class={styles.relationRow}>
              <span>Sin acciones disponibles</span>
              <span class={styles.relationMeta}>Flujo al día</span>
            </div>
          </Show>
        </div>
      </section>
    </div>
  );
}
