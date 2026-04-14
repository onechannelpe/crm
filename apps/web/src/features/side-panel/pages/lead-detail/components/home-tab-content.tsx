import { For, Show } from "solid-js";
import type { JSX } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import { CommercialInputSection } from "~/features/pipeline/detail/commercial-input-section";
import { LeadActionsWidget } from "~/features/pipeline/detail/lead-actions-widget";
import { blockingFieldLabel } from "~/features/pipeline/detail/lead-workflow-ui";
import { FieldChipList } from "~/features/side-panel/components/field-chip-list";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { FIELD_ROWS } from "./constants";

import styles from "../page.module.css";

type FieldKey = (typeof FIELD_ROWS)[number]["key"];

function renderTextField(data: LeadDetailView, key: FieldKey): string {
  if (key === "ruc") return data.lead.ruc;
  if (key === "razonSocial") return data.lead.razonSocial ?? "";
  if (key === "status") return data.lead.status ?? "";
  if (key === "prioridad") return data.lead.prioridad ?? "";
  if (key === "stage") return data.lead.stage;
  if (key === "nextStep") return data.lead.nextStep;
  if (key === "updatedAt") return formatDateTime(data.lead.updatedAt);
  return "";
}

function renderFieldValue(data: LeadDetailView, key: FieldKey): JSX.Element {
  if (key === "economicActivities") {
    return (
      <FieldChipList
        emptyLabel="—"
        items={data.sourceStatus.sunat.economicActivities.map((activity) => ({
          id: `${activity.role}-${activity.order ?? 0}-${activity.code}`,
          label: activity.code,
          tone: activity.role === "principal" ? "positive" : "neutral",
          tooltip: `${activity.label} - ${activity.description}`,
        }))}
      />
    );
  }

  return (
    <span class={styles.fieldTextValue}>{renderTextField(data, key)}</span>
  );
}

export function HomeTabContent(props: { data: LeadDetailView }) {
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
                  {renderFieldValue(props.data, field.key)}
                </div>
              </div>
            )}
          </For>
        </div>
      </section>

      <Show when={props.data.lead.stage === "NEEDS_EXECUTIVE_INPUT"}>
        <CommercialInputSection
          leadId={props.data.lead.id}
          initialValues={props.data.commercialInput}
        />
      </Show>

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

      <LeadActionsWidget
        leadId={props.data.lead.id}
        availableActions={props.data.availableActions}
      />
    </div>
  );
}
