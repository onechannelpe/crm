export type Lock = (() => void) | false;

export function createLock(name: string) {
  let lock: null | string = null;
  return (): Lock => {
    const openLock = (): void => {
      lock = null;
    };
    if (lock === null) {
      lock = name;
      return openLock;
    }
    return false;
  };
}

const globalHorizontalLock = createLock("dragHorizontal");
const globalVerticalLock = createLock("dragVertical");

export function getGlobalLock(
  drag: boolean | "x" | "y" | "lockDirection",
): Lock {
  let lock: Lock = false;
  if (drag === "y") {
    lock = globalVerticalLock();
  } else if (drag === "x") {
    lock = globalHorizontalLock();
  } else {
    const openHorizontal = globalHorizontalLock();
    const openVertical = globalVerticalLock();
    if (openHorizontal && openVertical) {
      lock = () => {
        openHorizontal();
        openVertical();
      };
    } else {
      // Release either acquired axis lock: a drag needs both locks or neither.
      if (openHorizontal) openHorizontal();
      if (openVertical) openVertical();
    }
  }
  return lock;
}

export function isDragActive() {
  // Acquiring both axis locks proves that no drag owns either axis.
  const openGestureLock = getGlobalLock(true);
  if (!openGestureLock) return true;
  openGestureLock();
  return false;
}
