import {
  createSignal,
  onCleanup,
  onMount,
  type JSX,
  type ParentProps,
} from "solid-js";

import styles from "./overflow-tooltip.module.css";

interface OverflowingTextProps {
  text: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export function OverflowingText(props: OverflowingTextProps) {
  const [textEl, setTextEl] = createSignal<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = createSignal(false);

  function measure() {
    const el = textEl();
    if (el) {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    }
  }

  onMount(() => {
    measure();
    const observer = new ResizeObserver(measure);
    const el = textEl();
    if (el) {
      observer.observe(el);
    }
    onCleanup(() => observer.disconnect());
  });

  return (
    <span
      class={`${styles.wrapper}${props.class ? ` ${props.class}` : ""}`}
      style={props.style}
    >
      <span ref={setTextEl} class={styles.text}>
        {props.text}
      </span>
      {isOverflowing() && (
        <span class={styles.tooltip} role="tooltip">
          {props.text}
        </span>
      )}
    </span>
  );
}

export function WithTooltip(
  props: ParentProps<{ tooltip: string; disabled?: boolean }>,
) {
  return (
    <span class={styles.wrapper}>
      {props.children}
      {!props.disabled && (
        <span class={styles.tooltip} role="tooltip">
          {props.tooltip}
        </span>
      )}
    </span>
  );
}
