import { createSignal } from "solid-js";
import { cn } from "~/lib/utils";
import { useResizablePanel } from "../hooks/use-resizable-panel";
import { useSidePanel } from "../state/use-side-panel";
import styles from "./resize-gap.module.css";

export function ResizeGap() {
  const { isOpen, panelWidth, setPanelWidth, closePanel } = useSidePanel();
  const [, setIsResizing] = createSignal(false);

  const { onPointerDown } = useResizablePanel({
    get currentWidth() {
      return panelWidth();
    },
    onWidthChange: setPanelWidth,
    onCollapse: closePanel,
    onResizeStart: () => setIsResizing(true),
    isOpen: true,
  });

  return (
    <div
      class={cn(styles.gap, !isOpen() && styles.gapClosed)}
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
    />
  );
}
