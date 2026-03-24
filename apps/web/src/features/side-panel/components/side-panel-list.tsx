import { type ParentProps, createSignal, onCleanup, onMount } from "solid-js";

import styles from "./side-panel-list.module.css";

export function SidePanelList(props: ParentProps) {
  let listRef: HTMLDivElement | undefined;
  const [focusedIndex, setFocusedIndex] = createSignal(-1);

  function getItems(): HTMLElement[] {
    if (!listRef) return [];
    return Array.from(listRef.querySelectorAll<HTMLElement>("[data-index]"));
  }

  function focusItem(index: number) {
    const items = getItems();
    if (items.length === 0) return;
    const clamped = ((index % items.length) + items.length) % items.length;
    setFocusedIndex(clamped);
    items[clamped]?.focus();
  }

  onMount(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!listRef) return;
      const items = getItems();
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusItem(focusedIndex() + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusItem(focusedIndex() - 1);
      } else if (e.key === "Enter") {
        const item = items[focusedIndex()];
        item?.click();
      }
    }

    listRef?.addEventListener("keydown", handleKeyDown);
    onCleanup(() => listRef?.removeEventListener("keydown", handleKeyDown));
  });

  return (
    <div
      ref={(el) => {
        listRef = el;
      }}
      class={styles.list}
    >
      {props.children}
    </div>
  );
}
