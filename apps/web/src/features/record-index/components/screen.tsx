import { RecordIndexInstanceProvider } from "../context/instance-context";
import { RecordIndexModelProvider } from "../context/model-context";
import { RecordIndexSetupProvider } from "../context/setup-context";
import { RecordIndexSetupEffects } from "../effects/setup";
import { useRecordIndexModel } from "../hooks/use-instance";
import { createRecordIndexContextModel } from "../model/derive";
import { createRecordIndexSetup } from "../model/setup";
import type { RecordIndexAdapter } from "../model/types";
import { RecordIndexHeader } from "./header";
import { RecordIndexLayout } from "./layout";
import { RecordIndexTableContainer } from "./table-container";

export function RecordIndexScreen<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { adapter: RecordIndexAdapter<T, TFilterValue, TSortValue> }) {
  const setup = createRecordIndexSetup(props.adapter);

  return (
    <RecordIndexSetupProvider value={setup}>
      <RecordIndexInstanceProvider source={setup}>
        <RecordIndexScreenContent adapter={props.adapter} />
      </RecordIndexInstanceProvider>
    </RecordIndexSetupProvider>
  );
}

function RecordIndexScreenContent<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { adapter: RecordIndexAdapter<T, TFilterValue, TSortValue> }) {
  const model = useRecordIndexModel(props.adapter);

  return (
    <RecordIndexModelProvider value={createRecordIndexContextModel(model)}>
      <RecordIndexLayout>
        <RecordIndexSetupEffects />
        <RecordIndexHeader pickerIcon={props.adapter.pickerIcon} />
        <RecordIndexTableContainer model={model} />
      </RecordIndexLayout>
    </RecordIndexModelProvider>
  );
}
