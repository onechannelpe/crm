import { createEffect, onCleanup, type JSX } from "solid-js";

interface AnimatedExpandableContainerProps {
  isExpanded: boolean;
  children: JSX.Element;
  duration?: number;
}

const EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/*
 * `scrollHeight` reads the full content height even when collapsed with
 * overflow:hidden, so the open animation targets the right value without
 * removing collapsed styles.
 *
 * State changes mid-animation lock the rendered height with
 * getBoundingClientRect() before cancelling, so the next animation starts from
 * what the user sees.
 */
export function AnimatedExpandableContainer(
  props: AnimatedExpandableContainerProps,
) {
  let el: HTMLDivElement | undefined;
  let currentAnim: Animation | undefined;
  let initialized = false;

  createEffect(() => {
    const open = props.isExpanded;
    if (!el) {
      return;
    }

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
      const currentH = el.getBoundingClientRect().height;
      currentAnim?.cancel();
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
        if (!el) {
          return;
        }
        el.style.height = "auto";
        el.style.overflow = "";
        el.style.opacity = "";
      };
    } else {
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
        if (!el) {
          return;
        }
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
