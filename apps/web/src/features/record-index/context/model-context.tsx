import { createContext, type JSX, useContext } from "solid-js";

import type { RecordIndexModel } from "../model/model";

const RecordIndexModelContext = createContext<RecordIndexModel | undefined>(
  undefined,
);

export function RecordIndexModelProvider(props: {
  value: RecordIndexModel;
  children: JSX.Element;
}) {
  return (
    <RecordIndexModelContext.Provider value={props.value}>
      {props.children}
    </RecordIndexModelContext.Provider>
  );
}

export function useRecordIndexModelContext() {
  const model = useContext(RecordIndexModelContext);

  if (!model) {
    throw new Error(
      "useRecordIndexModelContext must be used within RecordIndexModelProvider",
    );
  }

  return model;
}
