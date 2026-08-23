import { motion } from "@crm/solid-motion";
import { type JSX } from "@solidjs/web";

interface EnterTransitionProps {
  children: JSX.Element;
}

// Matches the easing the hand-rolled version used, expressed as motion's
// duration-in-seconds and cubic-bezier control points.
const ENTER = { duration: 0.28, ease: [0.16, 1, 0.3, 1] } as const;

/**
 * Reveals its children by growing from nothing to their natural height.
 *
 * The height is measured by motion rather than read off `scrollHeight`, which
 * is what the hand-rolled version did and which ignores padding and
 * `box-sizing`. Motion batches that measurement with every other element
 * measuring in the same frame, so several of these opening at once cost one
 * layout pass between them.
 *
 * The collapsed state is in the markup rather than written from an effect, so
 * there is no frame where the content is laid out at full height before the
 * animation starts.
 */
export function EnterTransition(props: EnterTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, overflow: "hidden" }}
      animate={{
        opacity: 1,
        height: "auto",
        // Clipping has to stay on until the box stops growing, and come off
        // afterwards so focus rings and popovers are not cut off.
        transitionEnd: { overflow: "visible" },
      }}
      transition={ENTER}
    >
      {props.children}
    </motion.div>
  );
}
