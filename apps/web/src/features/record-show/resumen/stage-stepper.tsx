import { For, Show } from "solid-js";

import Check from "~/components/icons/check";
import type { LeadStage } from "~/contracts/workflow/vocabulary";
import { leadStageLabel } from "~/features/workflow/presentation/lead-display";

import styles from "./resumen.module.css";

const PIPELINE: LeadStage[] = [
  "QUALIFYING",
  "PRICING",
  "SETUP",
  "FULFILLMENT",
  "LIVE",
];

function isTerminal(stage: LeadStage): boolean {
  return (
    stage === "DISQUALIFIED" || stage === "EXPIRED" || stage === "CLOSED_LOST"
  );
}

function stepState(
  stage: LeadStage,
  current: LeadStage,
): "done" | "current" | "todo" {
  const index = PIPELINE.indexOf(stage);
  const currentIndex = PIPELINE.indexOf(current);
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "todo";
}

export function StageStepper(props: { stage: LeadStage }) {
  return (
    <Show
      when={!isTerminal(props.stage)}
      fallback={
        <div class={styles.terminalBanner}>{leadStageLabel(props.stage)}</div>
      }
    >
      <ol class={styles.stepper}>
        <For each={PIPELINE}>
          {(stage) => {
            const state = stepState(stage, props.stage);
            return (
              <li class={styles.step} data-state={state}>
                <div class={styles.stepDotContainer}>
                  <Show
                    when={state === "done"}
                    fallback={<span class={styles.stepDot} />}
                  >
                    <span class={styles.stepCheck}>
                      <Check size={10} strokeWidth={3} />
                    </span>
                  </Show>
                </div>
                <span class={styles.stepLabel}>{leadStageLabel(stage)}</span>
              </li>
            );
          }}
        </For>
      </ol>
    </Show>
  );
}
