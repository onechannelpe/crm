import type { HotkeyCombo } from "~/browser/hotkey/types";
import { useHotkey } from "~/browser/hotkey/use-hotkey";

import { useHotkeyScope } from "./hotkey-boundary";
import type { ScopedHotkeyOptions } from "./types";

export function useScopedHotkey(
  combo: HotkeyCombo,
  handler: (event: KeyboardEvent) => void,
  options: ScopedHotkeyOptions = {},
): void {
  const scope = useHotkeyScope();

  useHotkey(combo, handler, {
    enabled: options.enabled,
    allowInInputs: options.allowInInputs,
    preventDefault: options.preventDefault,
    shouldHandleEvent: (event) => {
      const scopeElement = scope.container();
      if (!scopeElement) {
        return false;
      }

      return (
        event.target instanceof Node && scopeElement.contains(event.target)
      );
    },
  });
}
