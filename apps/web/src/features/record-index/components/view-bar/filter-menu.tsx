import { Show } from "solid-js";

import { useRecordIndex } from "../../context/record-index-context";
import { RecordIndexToolbarMenu } from "../toolbar-menu";
import { FilterDropdownContent } from "./filter-dropdown-content";

type FilterMenuProps = {
  isOpen: boolean;
  onToggle: () => void;
  onDismiss: () => void;
};

export function FilterMenu(props: FilterMenuProps) {
  const recordIndex = useRecordIndex();

  function resetFilterPanel() {
    recordIndex.filtering?.setPanel({ kind: "field-list" });
  }

  return (
    <Show when={recordIndex.definition.filter?.catalog}>
      {(filter) => (
        <RecordIndexToolbarMenu
          active={
            Boolean(recordIndex.filtering?.isActive()) ||
            Boolean(recordIndex.search?.value().trim())
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
        </RecordIndexToolbarMenu>
      )}
    </Show>
  );
}
