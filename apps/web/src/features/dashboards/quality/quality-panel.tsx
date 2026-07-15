import { A } from "@solidjs/router";
import { For, Show } from "solid-js";

import { Badge } from "~/components/ui/display/badge";
import type { QualitySummary } from "~/contracts/merchant-stats/views";
import {
  QUALITY_ISSUES,
  type QualityIssue,
} from "~/contracts/merchant-stats/vocabulary";

import { formatInteger } from "../format";

import styles from "./quality-panel.module.css";

// Every counter is a queue, so every counter is a link. A number with nowhere to
// go is a number nobody acts on.
//
// These queues never reach zero and are not meant to: the CRM will not hold a
// lead or a serial for every RUC the dealer sells to. They are a standing work
// list ordered by what is at stake, not a migration to finish.
const LABELS: Record<QualityIssue, string> = {
  conflict: "Atribución en conflicto",
  late: "Registrado después de la venta",
  none: "Sin evidencia en el CRM",
  no_target: "Meses sin proyectado",
  serial_mismatch: "Series que no cuadran con entregas",
};

export function QualityPanel(props: { summary: QualitySummary }) {
  return (
    <ul class={styles.list}>
      <For each={QUALITY_ISSUES}>
        {(issue) => (
          <li class={styles.row}>
            <A href={`/dashboards/calidad/${issue}`} class={styles.link}>
              <span class={styles.label}>{LABELS[issue]}</span>
              <Show
                when={props.summary[issue] > 0}
                fallback={
                  <span class={styles.zero}>
                    {formatInteger(props.summary[issue])}
                  </span>
                }
              >
                <Badge variant="warning">
                  {formatInteger(props.summary[issue])}
                </Badge>
              </Show>
            </A>
          </li>
        )}
      </For>
    </ul>
  );
}
