import { Show } from "solid-js";

import List from "~/components/icons/list";
import { DataGridToolbar } from "~/features/data-grid/components/toolbar";

import { useRecordIndexModelContext } from "../context/model-context";
import { useRecordIndexSetup } from "../context/setup-context";
import { RecordIndexViewBar } from "./view-bar";
import { RecordIndexViewPicker } from "./view-picker";

export function RecordIndexHeader() {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();
  const PickerIcon = setup.pickerIcon ?? List;

  const pickerOnClick = setup.views
    ? () =>
        model.columns.setOpenMenu((current) =>
          current === "views" ? null : "views",
        )
    : setup.pickerIcon
      ? () => {}
      : undefined;

  return (
    <DataGridToolbar
      picker={{
        icon: PickerIcon,
        label: setup.title(),
        meta: model.counts.pickerMeta(),
        onClick: pickerOnClick,
      }}
      pickerDropdown={
        <Show when={setup.views}>
          <RecordIndexViewPicker />
        </Show>
      }
      rightContent={<RecordIndexViewBar />}
    />
  );
}
