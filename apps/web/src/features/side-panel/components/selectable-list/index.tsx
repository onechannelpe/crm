import {
  createContext,
  createEffect,
  createMemo,
  useContext,
  type Accessor,
  type ParentProps,
} from "solid-js";

import { useHotkey } from "~/browser/hotkey/use-hotkey";
import { getVerticalNavigationAction } from "~/browser/keyboard/list-navigation";

import styles from "./styles.module.css";

type SelectableListContextValue = {
  selectedId: Accessor<string | null>;
  select: (id: string) => void;
};

const SelectableListContext = createContext<SelectableListContextValue>();

type SelectableListProps = ParentProps<{
  itemIds: readonly string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}>;

/*
  Selection lives on an id rather than on DOM focus, so the arrow keys walk the
  list while the caret stays in the top bar's search box. Moving focus onto the
  rows instead would end the user's typing on the first ArrowDown.
*/
export function SelectableList(props: SelectableListProps) {
  const selectedIndex = createMemo(() =>
    props.itemIds.findIndex((id) => id === props.selectedId),
  );

  // Anything that reorders the list (a new search, a narrowed filter) leaves the
  // old selection dangling, so fall back to the first row.
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

  return (
    <SelectableListContext.Provider
      value={{
        selectedId: () => props.selectedId,
        select: props.onSelect,
      }}
    >
      <div class={styles.list}>{props.children}</div>
    </SelectableListContext.Provider>
  );
}
