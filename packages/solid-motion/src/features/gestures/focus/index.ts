import { pipe } from "motion-utils";

import { addDomEvent } from "../../../events";
import { Feature } from "../../feature";

export class FocusGesture extends Feature {
  static key = "focus" as const;

  private isFocused = false;
  private removeFocus: VoidFunction | undefined;

  private onFocus() {
    let isFocusVisible = false;
    // Browsers without :focus-visible keep the native focus outline, so whileFocus
    // must activate for every focused element.
    try {
      isFocusVisible = (this.state.element as Element).matches(
        ":focus-visible",
      );
    } catch {
      isFocusVisible = true;
    }
    if (!isFocusVisible) return;
    this.state.setActive("whileFocus", true);
    this.isFocused = true;
  }

  private onBlur() {
    if (!this.isFocused) return;
    this.state.setActive("whileFocus", false);
    this.isFocused = false;
  }

  mount() {
    const element = this.state.element as Element;
    this.removeFocus = pipe(
      addDomEvent(element, "focus", () => this.onFocus()),
      addDomEvent(element, "blur", () => this.onBlur()),
    ) as VoidFunction;
  }

  unmount() {
    this.removeFocus?.();
    this.removeFocus = undefined;
  }
}
