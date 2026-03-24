import { cn } from "~/lib/utils";
import { useResizablePanel } from "../hooks/use-resizable-panel";
import { useSidePanel } from "../state/use-side-panel";
import styles from "./resize-gap.module.css";

type ResizeGapProps = {
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
};

export function ResizeGap(props: ResizeGapProps) {
  const { isOpen, panelWidth, setPanelWidth, closePanel } = useSidePanel();

  const { onPointerDown } = useResizablePanel({
    get currentWidth() {
      return panelWidth();
    },
    onWidthChange: (w) => {
      props.onResizeEnd?.();
      setPanelWidth(w);
    },
    onCollapse: () => {
      props.onResizeEnd?.();
      closePanel();
    },
    onResizeStart: () => props.onResizeStart?.(),
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
