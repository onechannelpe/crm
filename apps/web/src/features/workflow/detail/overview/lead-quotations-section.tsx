import { For, Show } from "solid-js";

import { formatDateTime } from "~/lib/utils";
import type { LeadDetailQuotationView } from "~/server/workflow/application/queries/views/lead-detail";

import sectionStyles from "./section-shell.module.css";
import styles from "./lead-quotations-section.module.css";

export function LeadQuotationsSection(props: {
  quotations: LeadDetailQuotationView[];
}) {
  return (
    <Show when={props.quotations.length > 0}>
      <section class={sectionStyles.section}>
        <div class={sectionStyles.sectionTitle}>Cotizaciones</div>
        <div class={styles.quoteList}>
          <For each={props.quotations}>
            {(quotation) => (
              <div class={styles.quoteRow}>
                <span>#{quotation.id}</span>
                <span class={styles.metaText}>
                  {formatDateTime(quotation.createdAt)}
                </span>
              </div>
            )}
          </For>
        </div>
      </section>
    </Show>
  );
}
