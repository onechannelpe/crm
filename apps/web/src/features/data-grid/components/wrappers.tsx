import type { JSX } from "solid-js";

import { DataGridInstanceProvider } from "../context/instance-context";
import { DataGridTableProvider } from "../context/table-context";
import { DataGridBodyEffects } from "../effects/body";
import type { DataGridInteractionModel } from "../hooks/use-instance";

export function DataGridWrappers<T extends { id: number }>(props: {
  children: JSX.Element;
  getContainer: () => HTMLElement | undefined;
  interaction: DataGridInteractionModel;
  rows: T[];
  suspendEscapeSelectionClear: boolean;
}) {
  return (
    <DataGridTableProvider
      value={{
        getContainer: props.getContainer,
        suspendEscapeSelectionClear: props.suspendEscapeSelectionClear,
      }}
    >
      <DataGridInstanceProvider value={props.interaction}>
        <DataGridBodyEffects rows={props.rows} />
        {props.children}
      </DataGridInstanceProvider>
    </DataGridTableProvider>
  );
}
