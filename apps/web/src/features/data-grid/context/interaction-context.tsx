import {
  createContext,
  type ParentProps,
  useContext,
  type Accessor,
} from "solid-js";

type DataGridInteractionContextValue = {
  isInteractive: Accessor<boolean>;
};

const DataGridInteractionContext =
  createContext<DataGridInteractionContextValue>();

export function DataGridInteractionProvider(
  props: ParentProps<{
    value: DataGridInteractionContextValue;
  }>,
) {
  return (
    <DataGridInteractionContext.Provider value={props.value}>
      {props.children}
    </DataGridInteractionContext.Provider>
  );
}

export function useDataGridInteractionReady() {
  const ctx = useContext(DataGridInteractionContext);

  if (!ctx) {
    throw new Error(
      "useDataGridInteractionReady must be used within DataGridInteractionProvider",
    );
  }

  return ctx.isInteractive;
}
