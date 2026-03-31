import List from "~/components/icons/list";
import { DataGridToolbar } from "~/features/data-grid/components/toolbar";

import { useRecordIndexModelContext } from "../context/model-context";
import { useRecordIndexSetup } from "../context/setup-context";
import { RecordIndexViewBar } from "./view-bar";

export function RecordIndexHeader() {
  const model = useRecordIndexModelContext();
  const setup = useRecordIndexSetup();
  const PickerIcon = setup.pickerIcon ?? List;

  return (
    <DataGridToolbar
      picker={{
        icon: PickerIcon,
        label: setup.title,
        meta: model.counts.pickerMeta(),
      }}
      rightContent={<RecordIndexViewBar />}
    />
  );
}
