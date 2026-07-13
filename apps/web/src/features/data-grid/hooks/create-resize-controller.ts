import { createSignal, type Accessor } from "solid-js";

export type DataGridResizeController = {
  columnWidths: Accessor<Readonly<Record<string, number>>>;
  active: Accessor<boolean>;
  begin: (input: {
    key: string;
    pointerId: number;
    clientX: number;
    currentWidth: number;
  }) => void;
  update: (pointerId: number, clientX: number) => void;
  complete: (pointerId: number) => void;
};

export function createDataGridResizeController(): DataGridResizeController {
  const [columnWidths, setColumnWidths] = createSignal<
    Readonly<Record<string, number>>
  >({});
  const [state, setState] = createSignal<{
    key: string;
    pointerId: number;
    startX: number;
    startWidth: number;
  }>();

  return {
    columnWidths,
    active: () => state() !== undefined,
    begin(input) {
      setState({
        key: input.key,
        pointerId: input.pointerId,
        startX: input.clientX,
        startWidth: input.currentWidth,
      });
    },
    update(pointerId, clientX) {
      const currentState = state();
      if (!currentState || currentState.pointerId !== pointerId) {
        return;
      }

      const width = Math.max(
        80,
        currentState.startWidth + (clientX - currentState.startX),
      );
      setColumnWidths((current) =>
        current[currentState.key] === width
          ? current
          : { ...current, [currentState.key]: width },
      );
    },
    complete(pointerId) {
      if (state()?.pointerId === pointerId) {
        setState(undefined);
      }
    },
  };
}
