import { type ParentProps, createSignal, onCleanup, onMount } from "solid-js";

import { getVerticalNavigationAction } from "~/lib/keyboard/list-navigation";

import styles from "./styles.module.css";

export function PanelList(props: ParentProps) {
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

      const action = getVerticalNavigationAction(e.key, {
        currentIndex: focusedIndex(),
        itemCount: items.length,
        loop: true,
        includeEnter: true,
      });

      if (!action) {
        return;
      }

      if (action.type === "move") {
        e.preventDefault();
        focusItem(action.nextIndex);
        return;
      }

      if (action.type === "trigger") {
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
