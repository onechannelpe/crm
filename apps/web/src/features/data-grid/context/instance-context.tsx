import { createContext, type JSX, useContext } from "solid-js";

import type { DataGridInteractionModel } from "../hooks/use-instance";

const DataGridInstanceContext = createContext<
  DataGridInteractionModel | undefined
>(undefined);

export function DataGridInstanceProvider(props: {
  value: DataGridInteractionModel;
  children: JSX.Element;
}) {
  return (
    <DataGridInstanceContext.Provider value={props.value}>
      {props.children}
    </DataGridInstanceContext.Provider>
  );
}

export function useDataGridInstance() {
  const instance = useContext(DataGridInstanceContext);

  if (!instance) {
    throw new Error(
      "useDataGridInstance must be used within DataGridInstanceProvider",
    );
  }

  return instance;
}
