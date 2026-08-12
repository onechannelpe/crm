const DEFAULT_MAX_RESIDENT_WEBGL_CONTEXTS = 6;

function readPositiveIntEnv(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getMaxResidentWebGlContexts(): number {
  return readPositiveIntEnv(
    import.meta.env.VITE_MAX_WEBGL_CONTEXTS,
    DEFAULT_MAX_RESIDENT_WEBGL_CONTEXTS,
  );
}

export type WebGlContextHandle = {
  markActive: () => void;
  markInactive: () => void;
  release: () => void;
};

type MountState = "active" | "inactive";

type MountEntry = {
  id: number;
  inactiveSince: number;
  onEvicted: () => void;
  state: MountState;
};

type ChangeListener = () => void;

let nextId = 0;

const mounts = new Map<number, MountEntry>();
const listeners = new Set<ChangeListener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function findEvictionCandidate(): MountEntry | null {
  let oldest: MountEntry | null = null;

  for (const entry of mounts.values()) {
    if (entry.state !== "inactive") {
      continue;
    }

    if (oldest === null || entry.inactiveSince < oldest.inactiveSince) {
      oldest = entry;
    }
  }

  return oldest;
}

// Only inactive mounts may be evicted. Visible mounts never lose their context.
export function tryAcquireWebGlContextSlot(
  onEvicted: () => void,
): WebGlContextHandle | null {
  if (mounts.size >= getMaxResidentWebGlContexts()) {
    const candidate = findEvictionCandidate();

    if (!candidate) {
      return null;
    }

    mounts.delete(candidate.id);
    candidate.onEvicted();
  }

  const id = nextId;
  nextId += 1;

  const entry: MountEntry = {
    id,
    inactiveSince: 0,
    onEvicted,
    state: "active",
  };

  mounts.set(id, entry);
  notify();

  let released = false;

  return {
    markActive: () => {
      if (released) {
        return;
      }

      entry.state = "active";
    },

    markInactive: () => {
      if (released || entry.state === "inactive") {
        return;
      }

      entry.state = "inactive";
      entry.inactiveSince = performance.now();
    },

    release: () => {
      if (released) {
        return;
      }

      released = true;
      mounts.delete(id);
      notify();
    },
  };
}

export function subscribeToWebGlContextCount(
  listener: ChangeListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
