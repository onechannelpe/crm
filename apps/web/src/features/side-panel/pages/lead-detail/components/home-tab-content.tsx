import { For, Show } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import { WithTooltip } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import { CommercialInputSection } from "~/features/pipeline/detail/commercial-input-section";
import { LeadActionsWidget } from "~/features/pipeline/detail/lead-actions-widget";
import { blockingFieldLabel } from "~/features/pipeline/detail/lead-workflow-ui";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import { FIELD_ROWS } from "./constants";

import styles from "../page.module.css";

function fieldValue(props: {
  data: LeadDetailView;
  key: (typeof FIELD_ROWS)[number]["key"];
}) {
  if (props.key === "ruc") return props.data.lead.ruc;
  if (props.key === "razonSocial") return props.data.lead.razonSocial ?? "";
  if (props.key === "economicActivities") return "";
  if (props.key === "status") return props.data.lead.status ?? "";
  if (props.key === "prioridad") return props.data.lead.prioridad ?? "";
  if (props.key === "stage") return props.data.lead.stage;
  if (props.key === "nextStep") return props.data.lead.nextStep;
  return formatDateTime(props.data.lead.updatedAt);
}

function EconomicActivitiesField(props: {
  activities: LeadDetailView["sourceStatus"]["sunat"]["economicActivities"];
}) {
  if (props.activities.length < 1) {
    return <span class={styles.fieldTextValue}>—</span>;
  }

  return (
    <div class={styles.economicActivitiesValue}>
      <div class={styles.economicActivityChipList}>
        <For each={props.activities}>
          {(activity) => (
            <WithTooltip tooltip={`${activity.label} - ${activity.description}`}>
              <span
                class={`${styles.economicActivityChip} ${
                  activity.kind === "principal"
                    ? styles.economicActivityChipPrincipal
                    : styles.economicActivityChipSecondary
                }`}
              >
                {activity.code}
              </span>
            </WithTooltip>
          )}
        </For>
      </div>
    </div>
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
                  <Show
                    when={field.key === "economicActivities"}
                    fallback={
                      <span class={styles.fieldTextValue}>
                        {fieldValue({ data: props.data, key: field.key })}
                      </span>
                    }
                  >
                    <EconomicActivitiesField
                      activities={
                        props.data.sourceStatus.sunat.economicActivities
                      }
                    />
                  </Show>
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
