import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
  type JSX,
} from "solid-js";

const DURATION_MS = 150;

interface PresenceTransitionProps {
  show: boolean;
  children: JSX.Element;
}

//Fades children in on mount and out before unmounting
export function PresenceTransition(props: PresenceTransitionProps) {
  const [mounted, setMounted] = createSignal(props.show);
  let el: HTMLDivElement | undefined;
  let anim: Animation | undefined;

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  createEffect(() => {
    const show = props.show;

    if (show) {
      setMounted(true);

      if (reducedMotion()) return;

      // After mount, el ref is set
      // rAF ensures paint before animating
      requestAnimationFrame(() => {
        if (!el) return;
        anim?.cancel();
        el.style.opacity = "0";
        anim = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: DURATION_MS,
          easing: "ease",
        });
        anim.onfinish = () => {
          if (el) el.style.opacity = "";
        };
      });
    } else {
      if (reducedMotion() || !el) {
        setMounted(false);
        return;
      }

      anim?.cancel();
      anim = el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: DURATION_MS,
        easing: "ease",
      });
      anim.onfinish = () => setMounted(false);
    }
  });

  onCleanup(() => anim?.cancel());

  return (
    <Show when={mounted()}>
      <div ref={(r) => (el = r)}>{props.children}</div>
    </Show>
  );
}
