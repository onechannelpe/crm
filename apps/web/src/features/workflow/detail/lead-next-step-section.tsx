import { For, Show } from "solid-js";

import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";

import { blockingFieldLabel } from "./lead-workflow-ui";

import styles from "./lead-detail-overview.module.css";

export function LeadNextStepSection(props: { data: LeadDetailView }) {
  return (
    <section class={styles.section}>
      <div class={styles.sectionTitle}>Siguiente paso</div>
      <div class={styles.fieldGrid}>
        <div class={styles.fieldRow}>
          <dt class={styles.fieldLabel}>Paso</dt>
          <dd class={styles.fieldValue}>{props.data.lead.nextStep}</dd>
        </div>
        <div class={styles.fieldRow}>
          <dt class={styles.fieldLabel}>Bloqueos</dt>
          <dd class={styles.fieldValue}>
            <Show
              when={props.data.blockingFields.length > 0}
              fallback="Ninguno"
            >
              <For each={props.data.blockingFields}>
                {(field, index) => (
                  <>
                    {index() > 0 ? ", " : ""}
                    {blockingFieldLabel(field)}
                  </>
                )}
              </For>
            </Show>
          </dd>
        </div>
      </div>
    </section>
  );
}
