import List from "~/components/icons/list";
import { DataGridToolbar } from "~/features/data-grid/components/toolbar";
import type { DataGridIcon } from "~/features/data-grid/model/types";

import { useRecordIndexModelContext } from "../context/model-context";
import { useRecordIndexSetup } from "../context/setup-context";
import { RecordIndexViewBar } from "./view-bar";
import { RecordIndexViewPicker } from "./view-picker";

export function RecordIndexHeader(props: { pickerIcon?: DataGridIcon }) {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();
  const PickerIcon = props.pickerIcon ?? List;

  const pickerOnClick = setup.views
    ? () =>
        model.columns.setOpenMenu((current) =>
          current === "views" ? null : "views",
        )
    : undefined;

  return (
    <DataGridToolbar
      picker={{
        label: setup.title(),
        meta: model.counts.pickerMeta(),
        onClick: pickerOnClick,
        hasDropdown: Boolean(setup.views),
        renderIcon: () => <PickerIcon size={16} />,
      }}
      slots={{
        dropdown: setup.views ? () => <RecordIndexViewPicker /> : undefined,
        actions: () => <RecordIndexViewBar />,
      }}
    />
  );
}
