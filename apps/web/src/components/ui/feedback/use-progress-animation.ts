import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

interface UseProgressAnimationOptions {
  durationMs: number;
  initialValue?: number;
  finalValue?: number;
  autoPlay?: boolean;
  onComplete?: () => void;
}

interface ProgressAnimationState {
  value: () => number;
  remainingMs: () => number;
  isPlaying: () => boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

export function useProgressAnimation(
  options: UseProgressAnimationOptions,
): ProgressAnimationState {
  const initialValue = options.initialValue ?? 100;
  const finalValue = options.finalValue ?? 0;
  const valueDelta = finalValue - initialValue;
  const [elapsedMs, setElapsedMs] = createSignal(0);
  const [isPlaying, setIsPlaying] = createSignal(options.autoPlay ?? true);

  let frameId: number | undefined;
  let lastTickTs: number | undefined;
  let completed = false;

  const durationMs = Math.max(0, options.durationMs);

  const progress = createMemo(() => {
    if (durationMs === 0) {
      return 1;
    }
    return Math.min(1, elapsedMs() / durationMs);
  });
  const value = createMemo(() => initialValue + valueDelta * progress());

  const remainingMs = createMemo(() => Math.max(0, durationMs - elapsedMs()));

  const stopFrame = () => {
    if (typeof window === "undefined") {
      return;
    }
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
      frameId = undefined;
    }
  };

  const tick = (ts: number) => {
    if (!isPlaying()) {
      lastTickTs = undefined;
      stopFrame();
      return;
    }

    if (lastTickTs === undefined) {
      lastTickTs = ts;
    }

    const delta = ts - lastTickTs;
    lastTickTs = ts;

    if (delta > 0) {
      setElapsedMs((prev) => {
        const next = Math.min(durationMs, prev + delta);
        if (next >= durationMs && durationMs > 0 && !completed) {
          completed = true;
          setIsPlaying(false);
          options.onComplete?.();
        }
        return next;
      });
    }

    if (isPlaying()) {
      frameId = requestAnimationFrame(tick);
    }
  };

  const ensureRunning = () => {
    if (typeof window === "undefined") {
      return;
    }
    if (frameId === undefined && isPlaying() && durationMs > 0) {
      frameId = requestAnimationFrame(tick);
    }
  };

  const play = () => {
    if (durationMs === 0 || completed) {
      return;
    }
    setIsPlaying(true);
    ensureRunning();
  };

  const pause = () => {
    setIsPlaying(false);
    lastTickTs = undefined;
    stopFrame();
  };

  const reset = () => {
    completed = false;
    setElapsedMs(0);
    lastTickTs = undefined;
    if (options.autoPlay ?? true) {
      setIsPlaying(true);
      ensureRunning();
      return;
    }
    setIsPlaying(false);
    stopFrame();
  };

  onMount(() => {
    if (options.autoPlay ?? true) {
      ensureRunning();
    }
  });

  onCleanup(() => {
    stopFrame();
  });

  return {
    value,
    remainingMs,
    isPlaying,
    play,
    pause,
    reset,
  };
}
