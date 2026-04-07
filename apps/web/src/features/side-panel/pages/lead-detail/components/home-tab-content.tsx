import { A } from "@solidjs/router";
import { For, Show } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import ChevronRight from "~/components/icons/chevron-right";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { FIELD_ROWS } from "./constants";

import styles from "../page.module.css";

const BLOCKING_FIELD_LABELS: Record<string, string> = {
  proveedorActual: "Proveedor actual",
  tasaActual: "Tasa actual",
  gpv: "GPV",
  ticket: "Ticket",
  abono: "Abono",
  cantidadPos: "Cantidad POS",
  banco: "Banco",
  nroCuenta: "Nro. cuenta",
  cci: "CCI",
};

type HomeTabContentProps = {
  data: LeadDetailView;
  approving?: boolean;
  onApproveForSale?: () => void;
};

function actionItems(data: LeadDetailView) {
  return data.availableActions
    .map((action) => {
      if (action === "review-lead") {
        return {
          id: action,
          label: "Revisar lead",
          href: `/review/${data.lead.id}`,
        };
      }
      if (action === "complete-commercial-input") {
        return {
          id: action,
          label: "Completar información comercial",
          href: `/leads/${data.lead.id}/complete`,
        };
      }
      if (action === "create-sale") {
        return {
          id: action,
          label: "Crear venta",
          href: `/sales/new/${data.lead.id}`,
        };
      }
      if (action === "create-quotation") {
        return {
          id: action,
          label: "Crear cotización",
          href: `/quotations/${data.lead.id}`,
        };
      }
      if (action === "approve-for-sale") {
        return {
          id: action,
          label: "Aprobar para venta",
        };
      }
      return null;
    })
    .filter((item) => item !== null);
}

function fieldValue(props: {
  data: LeadDetailView;
  key: (typeof FIELD_ROWS)[number]["key"];
}) {
  if (props.key === "ruc") return props.data.lead.ruc;
  if (props.key === "razonSocial")
    return props.data.lead.razonSocial ?? "Sin datos";
  if (props.key === "address") return props.data.lead.address ?? "Sin datos";
  if (props.key === "status") return props.data.lead.status ?? "Pendiente";
  if (props.key === "prioridad")
    return props.data.lead.prioridad ?? "Pendiente";
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
          <h3 class={styles.widgetTitle}>Fields</h3>
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
          <h3 class={styles.widgetTitle}>Workflow</h3>
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
                  .map((field) => BLOCKING_FIELD_LABELS[field] ?? field)
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
          <h3 class={styles.widgetTitle}>Actions</h3>
        </div>
        <div class={styles.relationList}>
          <For each={actions()}>
            {(action) => (
              <Show
                when={action.id !== "approve-for-sale"}
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
                <A class={styles.actionRowLink} href={action.href!}>
                  <span>{action.label}</span>
                  <ChevronRight size={14} />
                </A>
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
