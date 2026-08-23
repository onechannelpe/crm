import { motion } from "@crm/solid-motion";
import { type JSX } from "@solidjs/web";

interface AnimatedExpandableContainerProps {
  isExpanded: boolean;
  children: JSX.Element;
  /** Milliseconds, kept from the WAAPI original so no call site has to move. */
  duration?: number;
  opacityDuration?: number;
}

const EASE = [0.4, 0, 0.2, 1] as const;
const DEFAULT_DURATION_MS = 300;

const COLLAPSED = {
  height: 0,
  opacity: 0,
  overflow: "hidden",
  pointerEvents: "none",
} as const;

const EXPANDED = {
  height: "auto",
  opacity: 1,
  // Clipped for the whole of the expansion as well: content is laid out at its
  // full height from the first frame, so an unclipped box spills over whatever
  // sits below it until the height catches up. `transitionEnd` lifts the clip
  // once there is nothing left to clip, which is what lets an adornment or a
  // focus ring hang outside the container while it is open.
  overflow: "hidden",
  pointerEvents: "auto",
} as const;

/**
 * Height, opacity and interactivity, driven from one boolean.
 *
 * `height: auto` is measured by motion rather than read off `scrollHeight`,
 * which was the previous implementation's bug: `scrollHeight` rounds to an
 * integer and ignores padding under `box-sizing: content-box`, so a container
 * with padded content settled a few pixels short of where it belonged.
 */
export function AnimatedExpandableContainer(
  props: AnimatedExpandableContainerProps,
) {
  const seconds = (ms: number | undefined) =>
    (ms ?? DEFAULT_DURATION_MS) / 1000;

  return (
    <motion.div
      // Born in whichever state it is already in, so only a change to
      // `isExpanded` animates. The previous implementation spent a `didMount`
      // flag on the same rule.
      initial={props.isExpanded ? EXPANDED : COLLAPSED}
      animate={
        props.isExpanded
          ? { ...EXPANDED, transitionEnd: { overflow: "visible" } }
          : COLLAPSED
      }
      transition={{
        duration: seconds(props.duration),
        ease: EASE,
        opacity: {
          duration: seconds(props.opacityDuration ?? props.duration),
          ease: EASE,
        },
      }}
    >
      {props.children}
    </motion.div>
  );
}
