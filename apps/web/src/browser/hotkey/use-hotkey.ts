import { createEffect, onCleanup, type Accessor } from "solid-js";

import { matchesEvent, parseCombo } from "./hotkey-utils";
import type { HotkeyCombo } from "./types";

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingContext(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }
  if (INPUT_TAGS.has(target.tagName)) {
    return true;
  }
  if (target.getAttribute("contenteditable") != null) {
    return true;
  }
  return false;
}

interface UseHotkeyOptions {
  // When the accessor returns false the listener is detached entirely.
  // Defaults to always enabled.
  enabled?: Accessor<boolean>;
  // Allow the hotkey to fire when focus is inside an input, textarea, or
  // contenteditable element. Defaults to false: global hotkeys are
  // suppressed while the user types.
  allowInInputs?: boolean;
  // Prevent the default browser action when the hotkey fires. Defaults to true.
  preventDefault?: boolean;
  // Match on the produced character alone. Needed for keys the layout puts
  // behind a modifier: "/" is Shift+7 on the Latin American layout, so an exact
  // modifier match would leave the binding dead for those keyboards.
  ignoreModifiers?: boolean;
  // Return false to skip this event.
  shouldHandleEvent?: (event: KeyboardEvent) => boolean;
}

// Form-scoped keys (Escape inside an input, etc.) belong on the element's
// onKeyDown, not here.
export function useHotkey(
  combo: HotkeyCombo,
  handler: (event: KeyboardEvent) => void,
  options: UseHotkeyOptions = {},
): void {
  const {
    enabled,
    allowInInputs = false,
    preventDefault = true,
    ignoreModifiers = false,
    shouldHandleEvent,
  } = options;
  const parsed = parseCombo(combo);

  createEffect(() => {
    if (enabled && !enabled()) {
      return;
    }

    const listener = (event: KeyboardEvent) => {
      if (!allowInInputs && isTypingContext(event)) {
        return;
      }
      if (shouldHandleEvent && !shouldHandleEvent(event)) {
        return;
      }
      if (!matchesEvent(event, parsed, { ignoreModifiers })) {
        return;
      }
      if (preventDefault) {
        event.preventDefault();
      }
      handler(event);
    };

    document.addEventListener("keydown", listener);
    onCleanup(() => document.removeEventListener("keydown", listener));
  });
}
