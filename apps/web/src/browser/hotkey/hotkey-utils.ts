import type { HotkeyCombo, ParsedCombo } from "./types";

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator.platform ?? navigator.userAgent)
    .toLowerCase()
    .includes("mac");
}

export function parseCombo(combo: HotkeyCombo): ParsedCombo {
  const parts = combo.split("+");
  let ctrl = false;
  let shift = false;
  let alt = false;
  let meta = false;

  for (let i = 0; i < parts.length - 1; i++) {
    switch (parts[i].toLowerCase()) {
      case "mod":
        if (isMac()) meta = true;
        else ctrl = true;
        break;
      case "control":
      case "ctrl":
        ctrl = true;
        break;
      case "shift":
        shift = true;
        break;
      case "alt":
        alt = true;
        break;
      case "meta":
        meta = true;
        break;
    }
  }

  // Last segment is always the key; uppercase single letters to match event.key.
  const rawKey = parts[parts.length - 1];
  const key = rawKey.length === 1 ? rawKey.toUpperCase() : rawKey;

  return { key, ctrl, shift, alt, meta };
}

export function matchesEvent(
  event: KeyboardEvent,
  parsed: ParsedCombo,
): boolean {
  if (event.ctrlKey !== parsed.ctrl) return false;
  if (event.shiftKey !== parsed.shift) return false;
  if (event.altKey !== parsed.alt) return false;
  if (event.metaKey !== parsed.meta) return false;

  const { key: target } = parsed;

  if (target.length === 1 && /^[A-Z]$/.test(target)) {
    if (event.key.toUpperCase() === target) return true;
    // macOS dead-key fallback: Option+letter sets event.key to "Dead";
    // event.code still identifies the physical key.
    if (event.key === "Dead" && event.code?.startsWith("Key")) {
      return event.code.slice(3).toUpperCase() === target;
    }
    return false;
  }

  return event.key === target;
}
