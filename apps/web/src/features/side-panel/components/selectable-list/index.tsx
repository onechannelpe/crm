import { createEffect, createMemo, type ParentProps } from "solid-js";

import { useHotkey } from "~/browser/hotkey/use-hotkey";
import { getVerticalNavigationAction } from "~/browser/keyboard/list-navigation";

import styles from "./styles.module.css";

type SelectableListProps = ParentProps<{
  itemIds: readonly string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}>;

export function SelectableList(props: SelectableListProps) {
  const selectedIndex = createMemo(() =>
    props.itemIds.findIndex((id) => id === props.selectedId),
  );

  // Reset to the first item when the current selection disappears.
  createEffect(() => {
    const [firstId] = props.itemIds;

    if (firstId !== undefined && selectedIndex() === -1) {
      props.onSelect(firstId);
    }
  });

  function move(key: string) {
    const action = getVerticalNavigationAction(key, {
      currentIndex: selectedIndex(),
      itemCount: props.itemIds.length,
      loop: true,
    });

    if (action?.type !== "move") {
      return;
    }

    const nextId = props.itemIds[action.nextIndex];

    if (nextId !== undefined) {
      props.onSelect(nextId);
    }
  }

  useHotkey("ArrowDown", () => move("ArrowDown"), { allowInInputs: true });
  useHotkey("ArrowUp", () => move("ArrowUp"), { allowInInputs: true });

  return <div class={styles.list}>{props.children}</div>;
}
