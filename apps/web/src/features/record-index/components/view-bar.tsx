import { useRecordIndex } from "../context/record-index-context";
import type { RecordIndexMenu } from "../model/controller";
import { RecordIndexToolbarMenu } from "./toolbar-menu";
import { FilterMenu } from "./view-bar/filter-menu";
import { OptionsDropdown } from "./view-bar/options-dropdown";
import { SortMenu } from "./view-bar/sort-menu";

export function RecordIndexViewBar() {
  const recordIndex = useRecordIndex();

  const openMenu = () => recordIndex.columns.openMenu();
  const setOpenMenu = (menu: RecordIndexMenu) =>
    recordIndex.columns.setOpenMenu(menu);

  return (
    <>
      <FilterMenu
        isOpen={openMenu() === "filter"}
        onDismiss={() => setOpenMenu(null)}
        onToggle={() => setOpenMenu(openMenu() === "filter" ? null : "filter")}
      />

      <SortMenu
        isOpen={openMenu() === "sort"}
        onDismiss={() => setOpenMenu(null)}
        onToggle={() => setOpenMenu(openMenu() === "sort" ? null : "sort")}
      />

      <RecordIndexToolbarMenu
        active={recordIndex.columns.hasHidden()}
        label="Opciones"
        menuId={`${recordIndex.definition.id}-column-options`}
        open={openMenu() === "options"}
        onDismiss={() => setOpenMenu(null)}
        onToggle={() =>
          setOpenMenu(openMenu() === "options" ? null : "options")
        }
      >
        <OptionsDropdown onClose={() => setOpenMenu(null)} />
      </RecordIndexToolbarMenu>
    </>
  );
}
