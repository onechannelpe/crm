export function isPrimaryPointer(event: PointerEvent) {
  if (event.pointerType === "mouse") {
    return typeof event.button !== "number" || event.button <= 0;
  } else {
    // Touch pointers after the first have isPrimary=false. Older PointerEvent
    // implementations omit isPrimary, so only false rejects the event.
    return event.isPrimary !== false;
  }
}
