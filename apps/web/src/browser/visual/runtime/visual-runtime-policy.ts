export type WebGlPolicyDecision =
  | { allowed: true; reducedMotion: boolean }
  | { allowed: false; reason: WebGlPolicyDenialReason; reducedMotion: boolean };

export type WebGlPolicyDenialReason = "kill-switch" | "no-webgl-support";

function readBooleanEnv(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

let cachedSupportProbe: boolean | null = null;

function isWebGlContext(
  context: RenderingContext,
): context is WebGLRenderingContext | WebGL2RenderingContext {
  return (
    "getExtension" in context && typeof context.getExtension === "function"
  );
}

function detectWebGlSupport(): boolean {
  if (cachedSupportProbe !== null) {
    return cachedSupportProbe;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    cachedSupportProbe = false;
    return cachedSupportProbe;
  }

  try {
    const probeCanvas = document.createElement("canvas");
    const probeContext =
      probeCanvas.getContext("webgl2") ??
      probeCanvas.getContext("webgl") ??
      probeCanvas.getContext("experimental-webgl");

    if (!probeContext) {
      cachedSupportProbe = false;
      return cachedSupportProbe;
    }

    if (!isWebGlContext(probeContext)) {
      cachedSupportProbe = false;
      return cachedSupportProbe;
    }

    const loseContextExtension =
      probeContext.getExtension("WEBGL_lose_context");
    loseContextExtension?.loseContext();

    cachedSupportProbe = true;
    return cachedSupportProbe;
  } catch {
    cachedSupportProbe = false;
    return cachedSupportProbe;
  }
}

function detectPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function evaluateWebGlPolicy(): WebGlPolicyDecision {
  const reducedMotion = detectPrefersReducedMotion();

  if (readBooleanEnv(import.meta.env.VITE_DISABLE_HEAVY_VISUALS)) {
    return { allowed: false, reason: "kill-switch", reducedMotion };
  }

  if (!detectWebGlSupport()) {
    return { allowed: false, reason: "no-webgl-support", reducedMotion };
  }

  return { allowed: true, reducedMotion };
}
