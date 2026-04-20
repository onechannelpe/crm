import type { Accessor } from "solid-js";

import type { HotkeyCombo } from "~/lib/hotkey/types";

export type HotkeyScope = {
  container: Accessor<HTMLElement | undefined>;
};

export type ScopedHotkeyOptions = {
  enabled?: Accessor<boolean>;
  allowInInputs?: boolean;
  preventDefault?: boolean;
};

export type ScopedHotkeySpec = {
  combo: HotkeyCombo;
  handler: (event: KeyboardEvent) => void;
  options?: ScopedHotkeyOptions;
};
