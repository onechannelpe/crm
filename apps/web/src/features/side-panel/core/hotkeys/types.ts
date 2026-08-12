import type { Accessor } from "solid-js";

export type HotkeyScope = {
  container: Accessor<HTMLElement | undefined>;
};

export type ScopedHotkeyOptions = {
  enabled?: Accessor<boolean>;
  allowInInputs?: boolean;
  preventDefault?: boolean;
};
