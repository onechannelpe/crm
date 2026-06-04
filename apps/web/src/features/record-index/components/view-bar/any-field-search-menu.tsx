import { useRecordIndexModelContext } from "../../context/model-context";
import type { RecordIndexAnyFieldFilter } from "../../model/types";
import { DropdownMenuHeader } from "./menu-primitives";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

type AnyFieldSearchMenuProps = {
  anyFieldFilter: RecordIndexAnyFieldFilter;
  onClose: () => void;
};

export function AnyFieldSearchMenu(props: AnyFieldSearchMenuProps) {
  const model = useRecordIndexModelContext();

  return (
    <>
      <DropdownMenuHeader
        title="Buscar en cualquier campo"
        onClose={props.onClose}
        onBack={() => model.filtering.setPanel({ kind: "field-list" })}
      />
      <input
        autofocus
        type="text"
        class={sharedStyles.menuSearchInput}
        value={props.anyFieldFilter.value()}
        placeholder={props.anyFieldFilter.placeholder}
        onInput={(event) =>
          props.anyFieldFilter.setValue(event.currentTarget.value)
        }
      />
    </>
  );
}
