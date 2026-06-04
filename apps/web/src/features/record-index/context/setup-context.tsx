import { createContext, type JSX, useContext } from "solid-js";

import type { RecordIndexSetup } from "../model/setup-types";

const RecordIndexSetupContext = createContext<RecordIndexSetup | undefined>(
  undefined,
);

export function RecordIndexSetupProvider(props: {
  value: RecordIndexSetup;
  children: JSX.Element;
}) {
  return (
    <RecordIndexSetupContext.Provider value={props.value}>
      {props.children}
    </RecordIndexSetupContext.Provider>
  );
}

export function useRecordIndexSetup() {
  const setup = useContext(RecordIndexSetupContext);

  if (!setup) {
    throw new Error(
      "useRecordIndexSetup must be used within RecordIndexSetupProvider",
    );
  }

  return setup;
}
