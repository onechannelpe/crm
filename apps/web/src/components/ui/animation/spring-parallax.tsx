import { onCleanup, onMount, type JSX } from "solid-js";

interface SpringParallaxProps {
  children: JSX.Element;
  /** Max translation in px (applied symmetrically from center). Default: 2 */
  range?: number;
  /** Spring stiffness. Default: 100 (matches motion/framer-motion default) */
  stiffness?: number;
  /** Spring damping. Default: 10 (matches motion/framer-motion default) */
  damping?: number;
  /** Spring mass. Default: 1 */
  mass?: number;
}

/**
 * AnimatedPlaceholder:
 *
 *   - Tracking: direct linear remap of mouse → translate, no easing.
 *   - Leave: analytical underdamped spring ease-back to center.
 * 
 * Closed-form underdamped solution:
 *   x(t) = -e^(-ζω₀t) · [A·sin(ωd·t) + x₀·cos(ωd·t)]
 * where ωd = ω₀·√(1−ζ²), A = (v₀ + ζω₀x₀)/ωd
 */
export function SpringParallax(props: SpringParallaxProps) {
  let containerRef: HTMLDivElement | null = null;
  let rafId: number | undefined;

  onMount(() => {
    if (typeof window === "undefined" || !containerRef) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const range = props.range ?? 2;
    const stiffness = props.stiffness ?? 100;
    const damping = props.damping ?? 10;
    const mass = props.mass ?? 1;
    const el = containerRef;

    // Pre-computed spring constants
    const omega0 = Math.sqrt(stiffness / mass); // undamped angular freq (rad/s)
    const zeta = damping / (2 * Math.sqrt(stiffness * mass)); // damping ratio
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta); // damped angular freq

    let currentX = 0;
    let currentY = 0;

    const setTranslate = (x: number, y: number) => {
      currentX = x;
      currentY = y;
      el.style.transform = `translate(${x.toFixed(3)}px, ${y.toFixed(3)}px)`;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = undefined;
      }
      const x = (e.clientX / window.innerWidth - 0.5) * 2 * range;
      const y = (e.clientY / window.innerHeight - 0.5) * 2 * range;
      setTranslate(x, y);
    };

    const onMouseLeave = () => {
      // Capture spring origin at the moment the cursor leaves
      const x0 = currentX;
      const y0 = currentY;
      // Initial velocity is 0 — tracking was instantaneous (direct set)
      const Ax = (zeta * omega0 * x0) / omegaD;
      const Ay = (zeta * omega0 * y0) / omegaD;
      const startMs = performance.now();

      const animate = (now: DOMHighResTimeStamp) => {
        // t in seconds
        const t = (now - startMs) / 1000;
        const envelope = Math.exp(-zeta * omega0 * t);
        const sin = Math.sin(omegaD * t);
        const cos = Math.cos(omegaD * t);

        const x = -envelope * (Ax * sin + x0 * cos);
        const y = -envelope * (Ay * sin + y0 * cos);
        setTranslate(x, y);

        if (envelope < 0.001) {
          setTranslate(0, 0);
          return;
        }
        rafId = requestAnimationFrame(animate);
      };

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.document.addEventListener("mouseleave", onMouseLeave);

    onCleanup(() => {
      window.removeEventListener("mousemove", onMouseMove);
      window.document.removeEventListener("mouseleave", onMouseLeave);
      if (rafId != null) cancelAnimationFrame(rafId);
    });
  });

  return <div ref={(el) => (containerRef = el)}>{props.children}</div>;
}
