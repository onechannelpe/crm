import { createContext, type ParentProps, useContext } from "solid-js";

import type { DataGridController } from "../hooks/create-controller";

const DataGridContext = createContext<DataGridController>();

export function DataGridProvider(
  props: ParentProps<{ value: DataGridController }>,
) {
  return (
    <DataGridContext.Provider value={props.value}>
      {props.children}
    </DataGridContext.Provider>
  );
}

export function useDataGrid() {
  const grid = useContext(DataGridContext);
  if (!grid) {
    throw new Error("useDataGrid must be used within DataGridProvider");
  }

  return grid;
}
