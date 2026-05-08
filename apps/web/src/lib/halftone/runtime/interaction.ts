import * as THREE from "three";

import type { HalftoneInteractionState } from "../interaction-state";
import type { HalftoneSourceMode } from "../state";

type Ref<T> = { current: T };

export function createRuntimeInteractionHandlers({
  canvas,
  didInteractReference,
  getSourceMode,
  interactionReference,
  onFirstInteraction,
}: {
  canvas: HTMLCanvasElement;
  didInteractReference: Ref<boolean>;
  getSourceMode: () => HalftoneSourceMode;
  interactionReference: Ref<HalftoneInteractionState>;
  onFirstInteraction: () => void;
}) {
  const updatePointerPosition = (
    event: PointerEvent,
    options?: { resetVelocity?: boolean },
  ) => {
    const interaction = interactionReference.current;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);

    const nextMouseX = THREE.MathUtils.clamp(
      (event.clientX - rect.left) / width,
      0,
      1,
    );
    const nextMouseY = THREE.MathUtils.clamp(
      (event.clientY - rect.top) / height,
      0,
      1,
    );

    const deltaX = nextMouseX - interaction.mouseX;
    const deltaY = nextMouseY - interaction.mouseY;

    interaction.mouseX = nextMouseX;
    interaction.mouseY = nextMouseY;
    interaction.pointerInside =
      interaction.dragging ||
      (event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom);

    if (options?.resetVelocity) {
      interaction.pointerVelocityX = 0;
      interaction.pointerVelocityY = 0;
      interaction.smoothedMouseX = nextMouseX;
      interaction.smoothedMouseY = nextMouseY;
    } else {
      interaction.pointerVelocityX = deltaX;
      interaction.pointerVelocityY = deltaY;
    }
  };

  const markFirstInteraction = () => {
    if (didInteractReference.current) {
      return;
    }

    didInteractReference.current = true;
    onFirstInteraction();
  };

  const handlePointerMove = (event: PointerEvent) => {
    const interaction = interactionReference.current;
    const resetVelocity = !interaction.pointerInside && !interaction.dragging;
    updatePointerPosition(
      event,
      resetVelocity ? { resetVelocity: true } : undefined,
    );

    if (getSourceMode() === "image" && interaction.pointerInside) {
      markFirstInteraction();
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    updatePointerPosition(event, { resetVelocity: true });
    markFirstInteraction();
  };

  const handlePointerLeave = () => {
    const interaction = interactionReference.current;
    interaction.pointerInside = false;
    interaction.pointerVelocityX = 0;
    interaction.pointerVelocityY = 0;
  };

  return {
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
  };
}
