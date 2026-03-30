import { RecordIndexInstanceProvider } from "../context/instance-context";
import { useRecordIndexModel } from "../hooks/use-instance";
import type { RecordIndexAdapter } from "../model/types";
import { RecordIndexTable } from "./table";
import { RecordIndexToolbar } from "./toolbar";

export function RecordIndexScreen<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { adapter: RecordIndexAdapter<T, TFilterValue, TSortValue> }) {
  return (
    <RecordIndexInstanceProvider
      initialVisibleColumnKeys={
        new Set(props.adapter.columns.map((column) => column.key))
      }
      initialFilterValue={props.adapter.filter?.defaultValue}
      initialSortValue={props.adapter.sort?.defaultValue}
    >
      <div class={props.adapter.class}>
        <RecordIndexScreenContent adapter={props.adapter} />
      </div>
    </RecordIndexInstanceProvider>
  );
}

function RecordIndexScreenContent<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { adapter: RecordIndexAdapter<T, TFilterValue, TSortValue> }) {
  const model = useRecordIndexModel(props.adapter);

  return (
    <>
      <RecordIndexToolbar model={model} />
      <RecordIndexTable model={model} />
    </>
  );
}
