import { Show } from "solid-js";

import { DataGridToolbarMenu } from "~/features/data-grid/components/toolbar-menu";

import { useRecordIndexModelContext } from "../../context/model-context";
import { useRecordIndexSetup } from "../../context/setup-context";
import { FilterDropdownContent } from "./filter-dropdown-content";

type FilterMenuProps = {
  isOpen: boolean;
  onToggle: () => void;
  onDismiss: () => void;
};

export function FilterMenu(props: FilterMenuProps) {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();

  function resetFilterPanel() {
    model.filtering?.setPanel({ kind: "field-list" });
  }

  return (
    <Show when={setup.filter}>
      {(filter) => (
        <DataGridToolbarMenu
          active={
            Boolean(model.filtering?.isActive()) ||
            Boolean(model.search?.value().trim())
          }
          label={filter().label}
          menuId={filter().menuId}
          open={props.isOpen}
          onDismiss={() => {
            resetFilterPanel();
            props.onDismiss();
          }}
          onToggle={() => {
            if (!props.isOpen) {
              resetFilterPanel();
            }
            props.onToggle();
          }}
        >
          <FilterDropdownContent
            onClose={() => {
              resetFilterPanel();
              props.onDismiss();
            }}
          />
        </DataGridToolbarMenu>
      )}
    </Show>
  );
}
