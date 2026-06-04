import { For } from "solid-js";

import { useRecordIndexModelContext } from "../../context/model-context";
import type { RecordIndexFilterField } from "../../model/filter";
import { DropdownMenuHeader } from "./menu-primitives";

import sharedStyles from "~/features/data-grid/styles/data-grid.module.css";

type FilterValueMenuProps = {
  field: RecordIndexFilterField;
  onClose: () => void;
};

export function FilterValueMenu(props: FilterValueMenuProps) {
  const model = useRecordIndexModelContext();
  const Icon = () => props.field.icon;

  return (
    <>
      <DropdownMenuHeader
        title="Configurar filtro"
        onClose={props.onClose}
        onBack={() => model.filtering.setPanel({ kind: "field-list" })}
      />
      <div class={sharedStyles.menuScrollable}>
        <div class={sharedStyles.menuGroupLabel}>Valores</div>
        <div class={sharedStyles.menuListbox} role="menu">
          <For each={props.field.options}>
            {(option) => {
              const OptionIcon = Icon();
              return (
                <button
                  type="button"
                  class={sharedStyles.menuItem}
                  role="menuitemradio"
                  data-active={
                    model.filtering.filterValue() === option.value
                      ? "true"
                      : "false"
                  }
                  aria-checked={
                    model.filtering.filterValue() === option.value
                      ? "true"
                      : "false"
                  }
                  onClick={() => {
                    model.filtering.setFilterValue(option.value);
                    model.filtering.setPanel({ kind: "field-list" });
                    props.onClose();
                  }}
                >
                  <span class={sharedStyles.menuItemIcon}>
                    <OptionIcon size={16} />
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            }}
          </For>
        </div>
      </div>
    </>
  );
}
