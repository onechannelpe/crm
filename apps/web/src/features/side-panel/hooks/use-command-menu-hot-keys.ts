import { useHotkey } from "~/lib/hotkey/use-hotkey";
import { SIDE_PANEL_HOTKEY } from "../constants/side-panel-hotkey";
import { useSidePanel } from "../state/use-side-panel";

export function useCommandMenuHotKeys(): void {
  const { isOpen, openPanel, closePanel, navigationStack } = useSidePanel();

  useHotkey(SIDE_PANEL_HOTKEY, () => {
    if (isOpen()) {
      closePanel();
    } else {
      openPanel({
        key: "root",
        instanceId: crypto.randomUUID(),
        title: "Command menu",
        icon: () => null,
      });
    }
  });

  useHotkey("Escape", () => closePanel(), {
    enabled: isOpen,
    allowInInputs: true,
  });
}
