import { useRecordIndex } from "../../context/record-index-context";
import type { RecordIndexSearchControl } from "../../model/definition";
import { DropdownMenuHeader } from "./menu-primitives";

import sharedStyles from "../../styles/menu.module.css";

type AnyFieldSearchMenuProps = {
  search: RecordIndexSearchControl;
  onClose: () => void;
};

export function AnyFieldSearchMenu(props: AnyFieldSearchMenuProps) {
  const recordIndex = useRecordIndex();

  return (
    <>
      <DropdownMenuHeader
        title="Buscar en cualquier campo"
        onClose={props.onClose}
        onBack={() => recordIndex.filtering?.setPanel({ kind: "field-list" })}
      />
      <input
        autofocus
        type="text"
        class={sharedStyles.menuSearchInput}
        value={props.search.value()}
        placeholder={props.search.placeholder}
        onInput={(event) => props.search.set(event.currentTarget.value)}
      />
    </>
  );
}
