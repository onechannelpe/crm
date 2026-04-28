import { For, Show } from "solid-js";

import { leadNextStepLabel } from "~/features/workflow/presentation/lead-display";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";

import { blockingFieldLabel } from "./lead-workflow-ui";

import sectionStyles from "./section-shell.module.css";
import styles from "./lead-next-step-section.module.css";

export function LeadNextStepSection(props: { data: LeadDetailView }) {
  return (
    <section class={sectionStyles.section}>
      <div class={sectionStyles.sectionTitle}>Siguiente paso</div>
      <div class={styles.fieldGrid}>
        <div class={styles.fieldRow}>
          <dt class={styles.fieldLabel}>Paso</dt>
          <dd class={styles.fieldValue}>
            {leadNextStepLabel(props.data.lead.nextStep)}
          </dd>
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
