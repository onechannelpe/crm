import { createSignal, onMount, type Accessor } from "solid-js";

import { isMac } from "./hotkey-utils";

/*
  The server cannot know the platform, so the label starts as "Ctrl" on both
  sides of hydration and only switches after mount. Reading navigator during
  render would make the server markup disagree with the client.
*/
export function useModKeyLabel(): Accessor<string> {
  const [label, setLabel] = createSignal("Ctrl");

  onMount(() => {
    if (isMac()) {
      setLabel("⌘");
    }
  });

  return label;
}
