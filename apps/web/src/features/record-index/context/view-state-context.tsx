import { createContext, type JSX, useContext } from "solid-js";

import type { RecordIndexSetupColumn } from "../model/setup";
import {
  createRecordIndexViewState,
  type RecordIndexViewState,
} from "../model/view-state";

const RecordIndexViewStateContext = createContext<
  RecordIndexViewState | undefined
>(undefined);

export function RecordIndexViewStateProvider(props: {
  columns: ReadonlyArray<RecordIndexSetupColumn>;
  children: JSX.Element;
}) {
  const viewState = createRecordIndexViewState(props.columns);

  return (
    <RecordIndexViewStateContext.Provider value={viewState}>
      {props.children}
    </RecordIndexViewStateContext.Provider>
  );
}

export function useRecordIndexViewState() {
  const viewState = useContext(RecordIndexViewStateContext);

  if (!viewState) {
    throw new Error(
      "useRecordIndexViewState must be used within RecordIndexViewStateProvider",
    );
  }

  return viewState;
}
