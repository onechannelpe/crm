export type LetterKey =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";

export type NumberKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9";

export type EditingKey =
  | "Enter"
  | "Escape"
  | "Space"
  | "Tab"
  | "Backspace"
  | "Delete";

export type NavigationKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Home"
  | "End"
  | "PageUp"
  | "PageDown";

export type FunctionKey =
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "F9"
  | "F10"
  | "F11"
  | "F12";

/** All matchable non-modifier keys. */
export type Key =
  | LetterKey
  | NumberKey
  | EditingKey
  | NavigationKey
  | FunctionKey;

/**
 * Platform-adaptive modifier.
 * "Mod" = Ctrl on Windows/Linux, Cmd (Meta) on macOS.
 * Prefer "Mod" over "Ctrl"/"Meta" for cross-platform shortcuts.
 */
export type Modifier = "Mod" | "Control" | "Ctrl" | "Shift" | "Alt" | "Meta";

/** A hotkey combo string. Examples: "Mod+K", "Escape", "Shift+ArrowDown". */
export type HotkeyCombo =
  | Key
  | `${Modifier}+${Key}`
  | `${Modifier}+${Modifier}+${Key}`;

/** Internal parsed representation used for matching. */
export interface ParsedCombo {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}
