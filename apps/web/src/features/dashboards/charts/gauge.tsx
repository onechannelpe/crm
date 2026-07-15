import { Show } from "solid-js";

import { Present } from "~/components/ui/control-flow/present";

import { formatPercent, formatSoles } from "../format";

import styles from "./gauge.module.css";

interface GaugeProps {
  actual: number;
  target: number | null;
  caption?: string;
}

export function Gauge(props: GaugeProps) {
  // A target of zero is a real target ("we expect nothing here"), but it cannot
  // be attained against, so the bar and the percentage need a positive one while
  // the label below only needs it to exist.
  const positiveTarget = () =>
    props.target != null && props.target > 0 ? props.target : null;

  const hit = () => props.target != null && props.actual >= props.target;

  return (
    <div class={styles.gauge}>
      <div class={styles.figures}>
        <span class={styles.actual}>{formatSoles(props.actual)}</span>
        <Present when={props.target}>
          {(target) => (
            <span class={styles.target}>
              / {formatSoles(target())} objetivo
            </span>
          )}
        </Present>
      </div>
      <Present when={positiveTarget()}>
        {(target) => (
          <>
            <div class={styles.track}>
              <div
                class={styles.fill}
                classList={{ [styles.fillHit]: hit() }}
                style={{
                  width: `${Math.min(props.actual / target(), 1) * 100}%`,
                }}
              />
            </div>
            <div class={styles.legend}>
              <span classList={{ [styles.hitText]: hit() }}>
                {formatPercent(props.actual / target())} del objetivo
              </span>
              <Show when={props.caption}>
                <span class={styles.caption}>{props.caption}</span>
              </Show>
            </div>
          </>
        )}
      </Present>
    </div>
  );
}
