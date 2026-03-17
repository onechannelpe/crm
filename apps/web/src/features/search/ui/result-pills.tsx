import { createMemo, createSignal, For, Show } from "solid-js";

import styles from "./search-layout.module.css";

const DEFAULT_VISIBLE = 4;

interface ResultPillsProps {
  items: readonly string[];
  maxVisible?: number;
}

export function ResultPills(props: ResultPillsProps) {
  const [visibleCount, setVisibleCount] = createSignal(
    props.maxVisible ?? DEFAULT_VISIBLE,
  );
  const visibleItems = createMemo(() => props.items.slice(0, visibleCount()));
  const hiddenCount = createMemo(() =>
    Math.max(0, props.items.length - visibleItems().length),
  );

  return (
    <div class={styles.pillWrap}>
      <For each={visibleItems()}>
        {(item) => (
          <span class={styles.pill} title={item}>
            <span class={styles.pillText}>{item}</span>
          </span>
        )}
      </For>
      <Show when={hiddenCount() > 0}>
        <button
          type="button"
          class={`${styles.pill} ${styles.moreButton}`}
          onClick={() => setVisibleCount((count) => count + DEFAULT_VISIBLE)}
        >
          +{hiddenCount()} more
        </button>
      </Show>
      <Show when={props.items.length === 0}>
        <span class={styles.pill}>-</span>
      </Show>
    </div>
  );
}
