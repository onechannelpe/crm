import { createContext, type JSX, useContext } from "solid-js";

import {
  createRecordIndexStateOptions,
  createRecordIndexViewState,
  type RecordIndexViewStateSource,
} from "../model/state";
import type { RecordIndexViewState } from "../model/types";

const RecordIndexInstanceContext = createContext<
  RecordIndexViewState | undefined
>(undefined);

export function RecordIndexInstanceProvider(props: {
  source: RecordIndexViewStateSource;
  children: JSX.Element;
}) {
  const viewState = createRecordIndexViewState(
    createRecordIndexStateOptions(props.source),
  );

  return (
    <RecordIndexInstanceContext.Provider value={viewState}>
      {props.children}
    </RecordIndexInstanceContext.Provider>
  );
}

export function useRecordIndexViewState() {
  const viewState = useContext(RecordIndexInstanceContext);

  if (!viewState) {
    throw new Error(
      "useRecordIndexViewState must be used within RecordIndexInstanceProvider",
    );
  }

  return viewState;
}
