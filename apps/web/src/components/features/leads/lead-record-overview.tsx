import { A } from "@solidjs/router";
import { For, Show } from "solid-js";

import type { getLead } from "~/actions/pipeline/leads";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleAlert from "~/components/icons/circle-alert";
import Package from "~/components/icons/package";
import { Badge } from "~/components/ui/display/badge";
import { formatDate, formatDateTime } from "~/lib/utils";

import styles from "./lead-record-overview.module.css";

type LeadDetail = Awaited<ReturnType<typeof getLead>>;

function stageVariant(stage: string) {
  if (stage === "READY_FOR_SALE") return "success" as const;
  if (stage === "NEEDS_EXECUTIVE_INPUT") return "warning" as const;
  return "secondary" as const;
}

export function LeadRecordOverview(props: {
  data: LeadDetail;
  compact?: boolean;
}) {
  const fields = () =>
    [
      { label: "RUC", value: props.data.lead.ruc },
      {
        label: "Razón social",
        value: props.data.lead.razon_social ?? "Sin datos",
      },
      { label: "Dirección", value: props.data.lead.address ?? "Sin datos" },
      { label: "Estado", value: props.data.lead.status ?? "Sin datos" },
      { label: "Prioridad", value: props.data.lead.prioridad ?? "Sin datos" },
      { label: "Creado", value: formatDateTime(props.data.lead.created_at) },
      {
        label: "Actualizado",
        value: formatDateTime(props.data.lead.updated_at),
      },
    ] as const;

  const quotations = () => props.data.quotations ?? [];

  return (
    <div class={styles.content} data-compact={props.compact ? "true" : "false"}>
      <section class={styles.hero}>
        <div class={styles.heroIcon}>
          <Building2 size={16} />
        </div>
        <div class={styles.heroText}>
          <div class={styles.heroTitle}>
            {props.data.lead.razon_social ?? props.data.lead.ruc}
          </div>
          <div class={styles.heroSubtitle}>RUC {props.data.lead.ruc}</div>
        </div>
        <Badge variant={stageVariant(props.data.lead.stage)}>
          {props.data.lead.stage}
        </Badge>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionTitle}>Campos</div>
        <dl class={styles.fieldGrid}>
          <For each={fields()}>
            {(field) => (
              <div class={styles.fieldRow}>
                <dt class={styles.fieldLabel}>{field.label}</dt>
                <dd class={styles.fieldValue}>{field.value}</dd>
              </div>
            )}
          </For>
        </dl>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionTitle}>Timeline</div>
        <div class={styles.timeline}>
          <div class={styles.timelineItem}>
            <span class={styles.timelineIcon}>
              <CalendarDays size={14} />
            </span>
            <div>
              <div class={styles.timelineTitle}>Lead creado</div>
              <div class={styles.timelineMeta}>
                {formatDate(props.data.lead.created_at)}
              </div>
            </div>
          </div>
          <Show when={props.data.commercialInput}>
            <div class={styles.timelineItem}>
              <span class={styles.timelineIcon}>
                <Package size={14} />
              </span>
              <div>
                <div class={styles.timelineTitle}>
                  Información comercial registrada
                </div>
                <div class={styles.timelineMeta}>
                  Datos listos para revisión comercial
                </div>
              </div>
            </div>
          </Show>
        </div>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionTitle}>Tasks</div>
        <div class={styles.emptyBlock}>
          <span class={styles.timelineIcon}>
            <CircleAlert size={14} />
          </span>
          <div>
            <div class={styles.timelineTitle}>No hay tareas asociadas</div>
            <div class={styles.timelineMeta}>
              Este panel queda listo para una lista de tareas por lead.
            </div>
          </div>
        </div>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionTitle}>Acciones</div>
        <div class={styles.actions}>
          <Show when={props.data.lead.stage === "NEEDS_EXECUTIVE_INPUT"}>
            <A
              class={styles.primaryAction}
              href={`/leads/${props.data.lead.id}/complete`}
            >
              Completar información comercial
            </A>
          </Show>
          <Show when={props.data.lead.stage === "READY_FOR_SALE"}>
            <A
              class={styles.primaryAction}
              href={`/sales/new/${props.data.lead.id}`}
            >
              Crear venta
            </A>
          </Show>
          <A
            class={styles.secondaryAction}
            href={`/leads/${props.data.lead.id}`}
          >
            Abrir detalle completo
          </A>
        </div>
      </section>

      <Show when={quotations().length > 0}>
        <section class={styles.section}>
          <div class={styles.sectionTitle}>Cotizaciones</div>
          <div class={styles.quoteList}>
            <For each={quotations()}>
              {(quotation) => (
                <div class={styles.quoteRow}>
                  <span>#{quotation.id}</span>
                  <span class={styles.timelineMeta}>
                    {formatDateTime(quotation.created_at)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </section>
      </Show>
    </div>
  );
}
