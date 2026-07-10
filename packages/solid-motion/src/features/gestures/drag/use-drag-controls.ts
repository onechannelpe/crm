import type {
  DragControlOptions,
  VisualElementDragControls,
} from "./VisualElementDragControls";

export class DragControls {
  private componentControls = new Set<VisualElementDragControls>();

  subscribe(controls: VisualElementDragControls): () => void {
    this.componentControls.add(controls);

    return () => this.componentControls.delete(controls);
  }

  start(event: PointerEvent, options?: DragControlOptions) {
    this.componentControls.forEach((controls) => {
      controls.start(event, options);
    });
  }
}

const createDragControls = () => new DragControls();

/** Starts a drag from a pointer event on another element. */
export const useDragControls = createDragControls;
