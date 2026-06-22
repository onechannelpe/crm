import { Show } from "solid-js";

import type { RecordContext } from "~/features/record-show/model/record-context";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";

import { NextActionCard } from "./next-action-card";
import { StageStepper } from "./stage-stepper";

import styles from "./resumen.module.css";

export function ResumenTab(props: {
  context: RecordContext;
  onNavigate: (id: RecordTabId) => void;
}) {
  return (
    <Show
      when={props.context.kind === "lead" ? props.context.data : null}
      keyed
    >
      {(data) => (
        <div class={styles.resumen}>
          <StageStepper stage={data.lead.stage} />
          <NextActionCard data={data} onNavigate={props.onNavigate} />
        </div>
      )}
    </Show>
  );
}
