import { useRecordIndexModelContext } from "../../context/model-context";
import { useRecordIndexSetup } from "../../context/setup-context";
import type { RecordIndexMenu } from "../../model/types";
import { DataGridToolbarMenu } from "~/features/data-grid/components/toolbar-menu";

import { FilterMenu } from "./filter-menu";
import { OptionsDropdown } from "./options-dropdown";
import { SortMenu } from "./sort-menu";

export function RecordIndexViewBar() {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();

  const openMenu = () => model.columns.openMenu();
  const setOpenMenu = (menu: RecordIndexMenu) => model.columns.setOpenMenu(menu);

  return (
    <>
      <FilterMenu
        isOpen={openMenu() === "filter"}
        onDismiss={() => setOpenMenu(null)}
        onToggle={() =>
          setOpenMenu(openMenu() === "filter" ? null : "filter")
        }
      />

      <SortMenu
        isOpen={openMenu() === "sort"}
        onDismiss={() => setOpenMenu(null)}
        onToggle={() =>
          setOpenMenu(openMenu() === "sort" ? null : "sort")
        }
      />

      <DataGridToolbarMenu
        active={model.columns.hasHiddenColumns()}
        label="Opciones"
        menuId={`${setup.id}-column-options`}
        open={openMenu() === "options"}
        onDismiss={() => setOpenMenu(null)}
        onToggle={() =>
          setOpenMenu(openMenu() === "options" ? null : "options")
        }
      >
        <OptionsDropdown onClose={() => setOpenMenu(null)} />
      </DataGridToolbarMenu>
    </>
  );
}
