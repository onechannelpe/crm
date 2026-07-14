import { Show } from "solid-js";

import { formatPercent, formatSoles } from "../format";

import styles from "./gauge.module.css";

interface GaugeProps {
  actual: number;
  target: number | null;
  caption?: string;
}

export function Gauge(props: GaugeProps) {
  const ratio = () =>
    props.target && props.target > 0
      ? Math.min(props.actual / props.target, 1)
      : 0;
  const hit = () => props.target != null && props.actual >= props.target;

  return (
    <div class={styles.gauge}>
      <div class={styles.figures}>
        <span class={styles.actual}>{formatSoles(props.actual)}</span>
        <Show when={props.target != null}>
          <span class={styles.target}>
            / {formatSoles(props.target!)} objetivo
          </span>
        </Show>
      </div>
      <Show when={props.target != null && props.target! > 0}>
        <div class={styles.track}>
          <div
            class={styles.fill}
            classList={{ [styles.fillHit]: hit() }}
            style={{ width: `${ratio() * 100}%` }}
          />
        </div>
        <div class={styles.legend}>
          <span classList={{ [styles.hitText]: hit() }}>
            {formatPercent(props.actual / props.target!)} del objetivo
          </span>
          <Show when={props.caption}>
            <span class={styles.caption}>{props.caption}</span>
          </Show>
        </div>
      </Show>
    </div>
  );
}
