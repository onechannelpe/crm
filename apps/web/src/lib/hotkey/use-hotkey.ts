import { createEffect, onCleanup, type Accessor } from "solid-js";

import { matchesEvent, parseCombo } from "./hotkey-utils";
import type { HotkeyCombo } from "./types";

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingContext(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (INPUT_TAGS.has(target.tagName)) return true;
  if (target.getAttribute("contenteditable") != null) return true;
  return false;
}

interface UseHotkeyOptions {
  /**
   * Gate the listener on a reactive boolean accessor.
   * When the accessor returns false the listener is detached entirely.
   * Defaults to always enabled.
   */
  enabled?: Accessor<boolean>;
  /**
   * Allow the hotkey to fire when focus is inside an input, textarea, or
   * contenteditable element. Defaults to false — global hotkeys are suppressed
   * while the user types.
   */
  allowInInputs?: boolean;
  /** Prevent the default browser action when the hotkey fires. Defaults to true. */
  preventDefault?: boolean;
  /**
   * Optional predicate to gate hotkey handling for a specific event.
   * Return false to skip this event.
   */
  shouldHandleEvent?: (event: KeyboardEvent) => boolean;
}

/**
 * Registers a global document-level keyboard shortcut that is automatically
 * cleaned up when the calling component is destroyed.
 *
 * Use "Mod+K" for cross-platform shortcuts (Ctrl on Windows/Linux, Cmd on macOS).
 * Leave form-scoped key handling (e.g. Escape to go back within a login step)
 * on the element's onKeyDown — this hook is for document-level shortcuts only.
 *
 * @example
 * useHotkey("Mod+K", () => openCommandPalette());
 * useHotkey("Escape", closeDialog, { enabled: isOpen, allowInInputs: true });
 */
export function useHotkey(
  combo: HotkeyCombo,
  handler: (event: KeyboardEvent) => void,
  options: UseHotkeyOptions = {},
): void {
  const {
    enabled,
    allowInInputs = false,
    preventDefault = true,
    shouldHandleEvent,
  } = options;
  const parsed = parseCombo(combo);

  createEffect(() => {
    if (enabled && !enabled()) return;

    const listener = (event: KeyboardEvent) => {
      if (!allowInInputs && isTypingContext(event)) return;
      if (shouldHandleEvent && !shouldHandleEvent(event)) return;
      if (!matchesEvent(event, parsed)) return;
      if (preventDefault) event.preventDefault();
      handler(event);
    };

    document.addEventListener("keydown", listener);
    onCleanup(() => document.removeEventListener("keydown", listener));
  });
}
