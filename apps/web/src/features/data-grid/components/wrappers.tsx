import type { JSX } from "solid-js";

import { DataGridInstanceProvider } from "../context/instance-context";
import { DataGridInteractionProvider } from "../context/interaction-context";
import { DataGridTableProvider } from "../context/table-context";
import { DataGridBodyEffects } from "../effects/body";
import type { DataGridInteractionModel } from "../hooks/use-instance";
import { createDataGridInteractionReady } from "../hooks/use-interaction-ready";

export function DataGridWrappers(props: {
  children: JSX.Element;
  getContainer: () => HTMLElement | undefined;
  getScrollWrapper: () => HTMLElement | undefined;
  interaction: DataGridInteractionModel;
  rows: Array<{ id: string | number }>;
  suspendEscapeSelectionClear: boolean;
}) {
  const isInteractive = createDataGridInteractionReady();

  return (
    <DataGridTableProvider
      value={{
        getContainer: props.getContainer,
        getScrollWrapper: props.getScrollWrapper,
        suspendEscapeSelectionClear: props.suspendEscapeSelectionClear,
      }}
    >
      <DataGridInteractionProvider value={{ isInteractive }}>
        <DataGridInstanceProvider value={props.interaction}>
          <DataGridBodyEffects rows={props.rows} />
          {props.children}
        </DataGridInstanceProvider>
      </DataGridInteractionProvider>
    </DataGridTableProvider>
  );
}
