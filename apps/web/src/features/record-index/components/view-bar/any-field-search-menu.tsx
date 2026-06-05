import { useRecordIndexModelContext } from "../../context/model-context";
import type { RecordIndexSearchControl } from "../../model/adapter";
import { DropdownMenuHeader } from "./menu-primitives";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

type AnyFieldSearchMenuProps = {
  search: RecordIndexSearchControl;
  onClose: () => void;
};

export function AnyFieldSearchMenu(props: AnyFieldSearchMenuProps) {
  const model = useRecordIndexModelContext();

  return (
    <>
      <DropdownMenuHeader
        title="Buscar en cualquier campo"
        onClose={props.onClose}
        onBack={() => model.filtering?.setPanel({ kind: "field-list" })}
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
