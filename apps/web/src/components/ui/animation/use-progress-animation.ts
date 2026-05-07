import { createSignal, onCleanup } from "solid-js";

export interface ProgressAnimationOptions {
  durationMs: number;
  onComplete?: () => void;
}

export function useProgressAnimation(options: ProgressAnimationOptions) {
  const durationMs = Math.max(0, options.durationMs);
  const [progress, setProgress] = createSignal(0);

  let animationFrame: number | undefined;
  let frameStart: number | undefined;
  let remainingMs = durationMs;
  let isCompleted = false;
  let isRunning = false;

  const cancelFrame = () => {
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
    }
  };

  const complete = () => {
    if (isCompleted) return;
    isCompleted = true;
    isRunning = false;
    remainingMs = 0;
    cancelFrame();
    setProgress(1);
    options.onComplete?.();
  };

  const tick = (now: number) => {
    if (!isRunning) return;
    if (frameStart === undefined) frameStart = now;

    const elapsed = Math.max(0, now - frameStart);
    const elapsedInSegment = Math.min(elapsed, remainingMs);
    const nextProgress =
      durationMs === 0 ? 1 : 1 - (remainingMs - elapsedInSegment) / durationMs;

    setProgress(Math.min(Math.max(nextProgress, 0), 1));

    if (elapsedInSegment >= remainingMs) {
      complete();
      return;
    }

    animationFrame = requestAnimationFrame(tick);
  };

  const play = () => {
    if (isRunning || isCompleted) return;
    if (durationMs === 0 || remainingMs <= 0) {
      complete();
      return;
    }

    isRunning = true;
    frameStart = undefined;
    cancelFrame();
    animationFrame = requestAnimationFrame(tick);
  };

  const pause = () => {
    if (!isRunning) return;
    isRunning = false;
    cancelFrame();

    if (frameStart !== undefined) {
      remainingMs = Math.max(0, remainingMs - (performance.now() - frameStart));
    }
    frameStart = undefined;
  };

  onCleanup(cancelFrame);

  return { progress, pause, play };
}
