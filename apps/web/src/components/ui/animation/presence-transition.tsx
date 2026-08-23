import { AnimatePresence, motion } from "@crm/solid-motion";
import { type JSX } from "@solidjs/web";

interface PresenceTransitionProps {
  show: boolean;
  children: JSX.Element;
}

// CSS `ease`, which is what the hand-rolled version passed to WAAPI.
const FADE = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } as const;

/**
 * Fades its children in and out, keeping them mounted until the fade out ends.
 *
 * The boundary owns the subtree, which is what makes the exit possible at all:
 * Solid disposes a branch the moment its condition flips, so the hand-rolled
 * version had to keep its own `mounted` signal and a `requestAnimationFrame`
 * to get a paint in before animating. Both are gone, along with the entrance
 * flash the rAF caused.
 */
export function PresenceTransition(props: PresenceTransitionProps) {
  return (
    <AnimatePresence when={props.show}>
      {() => (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={FADE}
        >
          {props.children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
