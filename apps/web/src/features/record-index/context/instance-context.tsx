import { createContext, type JSX, useContext } from "solid-js";

import { createRecordIndexViewState } from "../hooks/use-state";
import type { RecordIndexViewState } from "../model/types";

const RecordIndexInstanceContext = createContext<
  RecordIndexViewState | undefined
>(undefined);

export function RecordIndexInstanceProvider(props: {
  initialVisibleColumnKeys: Set<string>;
  initialFilterValue?: string;
  initialSortValue?: string;
  children: JSX.Element;
}) {
  const viewState = createRecordIndexViewState(
    props.initialVisibleColumnKeys,
    props.initialFilterValue,
    props.initialSortValue,
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
