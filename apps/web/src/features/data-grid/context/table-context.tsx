import { createContext, type JSX, useContext } from "solid-js";

type DataGridTableContextValue = {
  getContainer: () => HTMLElement | undefined;
  suspendEscapeSelectionClear: boolean;
};

const DataGridTableContext = createContext<
  DataGridTableContextValue | undefined
>(undefined);

export function DataGridTableProvider(props: {
  value: DataGridTableContextValue;
  children: JSX.Element;
}) {
  return (
    <DataGridTableContext.Provider value={props.value}>
      {props.children}
    </DataGridTableContext.Provider>
  );
}

export function useDataGridTable() {
  const context = useContext(DataGridTableContext);

  if (!context) {
    throw new Error(
      "useDataGridTable must be used within DataGridTableProvider",
    );
  }

  return context;
}
