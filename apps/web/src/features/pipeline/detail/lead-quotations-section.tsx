import { For, Show } from "solid-js";

import { formatDateTime } from "~/lib/utils";
import type { LeadDetailQuotationView } from "~/server/pipeline/application/queries/views/lead-detail";

import styles from "./lead-detail-overview.module.css";

export function LeadQuotationsSection(props: {
  quotations: LeadDetailQuotationView[];
}) {
  return (
    <Show when={props.quotations.length > 0}>
      <section class={styles.section}>
        <div class={styles.sectionTitle}>Cotizaciones</div>
        <div class={styles.quoteList}>
          <For each={props.quotations}>
            {(quotation) => (
              <div class={styles.quoteRow}>
                <span>#{quotation.id}</span>
                <span class={styles.timelineMeta}>
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
