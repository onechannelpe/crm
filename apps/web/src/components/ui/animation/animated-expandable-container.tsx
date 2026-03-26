import { createEffect, onCleanup, type JSX } from "solid-js";

interface AnimatedExpandableContainerProps {
  isExpanded: boolean;
  children: JSX.Element;
  /** Animation duration in milliseconds. Defaults to 300. */
  duration?: number;
}

const EASING = "cubic-bezier(0.4, 0, 0.2, 1)"; // standard ease-in-out

/**
 * Animates a container open and closed by changing its height and opacity.
 *
 * How it works:
 * - When expanding, it reads `scrollHeight` to get the content's full pixel height.
 * - When collapsing, it animates from the element's current rendered height to `0px`.
 * - After the expand animation finishes, it sets `height` to `auto` so the content
 *   can grow or shrink normally.
 *
 * Why `scrollHeight` is used:
 * - `scrollHeight` returns the full content height even when the element is currently
 *   collapsed with `height: 0` and `overflow: hidden`.
 * - That lets the component animate to the correct open height without temporarily
 *   removing the collapsed styles.
 *
 * Interrupted animation behavior:
 * - If the expand/collapse state changes while an animation is still running, the
 *   component first reads the element's current visible height with
 *   `getBoundingClientRect().height`.
 * - It then cancels the current animation and immediately writes that pixel height
 *   back to `style.height`.
 * - This makes the next animation start from the height the user actually sees,
 *   instead of jumping back to an older value.
 */
export function AnimatedExpandableContainer(
  props: AnimatedExpandableContainerProps,
) {
  let el: HTMLDivElement | undefined;
  let currentAnim: Animation | undefined;
  let initialized = false;

  createEffect(() => {
    const open = props.isExpanded;
    if (!el) return;

    // First render, apply initial state without any animation
    if (!initialized) {
      initialized = true;
      if (!open) {
        el.style.height = "0px";
        el.style.overflow = "hidden";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      }
      return;
    }

    const duration = props.duration ?? 300;

    if (open) {
      // Capture current rendered height before cancelling so we can lock it in
      const currentH = el.getBoundingClientRect().height;
      currentAnim?.cancel();

      // scrollHeight = full content height regardless of overflow/height constraints
      const targetH = el.scrollHeight;
      el.style.height = `${currentH}px`;
      el.style.overflow = "hidden";
      el.style.pointerEvents = "";
      el.style.opacity = "";

      currentAnim = el.animate(
        [
          { height: `${currentH}px`, opacity: "0" },
          { height: `${targetH}px`, opacity: "1" },
        ],
        { duration, easing: EASING },
      );
      currentAnim.onfinish = () => {
        if (!el) return;
        el.style.height = "auto";
        el.style.overflow = "";
        el.style.opacity = "";
      };
    } else {
      // Lock in current rendered position before WAAPI cancel reverts the style
      const currentH = el.getBoundingClientRect().height;
      currentAnim?.cancel();

      el.style.height = `${currentH}px`;
      el.style.overflow = "hidden";
      el.style.pointerEvents = "none";

      currentAnim = el.animate(
        [
          { height: `${currentH}px`, opacity: "1" },
          { height: "0px", opacity: "0" },
        ],
        { duration, easing: EASING },
      );
      currentAnim.onfinish = () => {
        if (!el) return;
        el.style.height = "0px";
        el.style.opacity = "0";
      };
    }
  });

  onCleanup(() => currentAnim?.cancel());

  return (
    <div
      ref={(e) => (el = e)}
      style={{
        height: props.isExpanded ? "auto" : "0px",
        overflow: props.isExpanded ? "visible" : "hidden",
        opacity: props.isExpanded ? "1" : "0",
        "pointer-events": props.isExpanded ? "auto" : "none",
      }}
    >
      {props.children}
    </div>
  );
}
