import { For, Show } from "solid-js";

import type { LeadDetailView } from "~/actions/pipeline/contracts";

import styles from "./lead-detail-overview.module.css";

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
                    {BLOCKING_FIELD_LABELS[field] ?? field}
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
