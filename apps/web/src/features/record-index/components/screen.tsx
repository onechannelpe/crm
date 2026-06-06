import { RecordIndexModelProvider } from "../context/model-context";
import { RecordIndexSetupProvider } from "../context/setup-context";
import { RecordIndexViewStateProvider } from "../context/view-state-context";
import { useRecordIndexModel } from "../hooks/use-record-index-model";
import type { RecordIndexAdapter } from "../model/adapter";
import { createRecordIndexSetup } from "../model/setup";
import { RecordIndexHeader } from "./header";
import { RecordIndexLayout } from "./layout";
import { RecordIndexTableContainer } from "./table-container";

export function RecordIndexScreen<T extends { id: string }>(props: {
  adapter: RecordIndexAdapter<T>;
}) {
  const setup = createRecordIndexSetup(props.adapter);

  return (
    <RecordIndexSetupProvider value={setup}>
      <RecordIndexViewStateProvider columns={setup.columns}>
        <RecordIndexScreenContent adapter={props.adapter} />
      </RecordIndexViewStateProvider>
    </RecordIndexSetupProvider>
  );
}

function RecordIndexScreenContent<T extends { id: string }>(props: {
  adapter: RecordIndexAdapter<T>;
}) {
  const model = useRecordIndexModel(props.adapter);

  return (
    <RecordIndexModelProvider value={model.context}>
      <RecordIndexLayout>
        <RecordIndexHeader pickerIcon={props.adapter.pickerIcon} />
        <RecordIndexTableContainer model={model} />
      </RecordIndexLayout>
    </RecordIndexModelProvider>
  );
}
