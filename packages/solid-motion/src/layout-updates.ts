import type { IProjectionNode } from "motion-dom";

/** Projection lifecycle supplied by an element. */
export interface LayoutHost {
  /** Builds the node once its element is connected and its parent is known. */
  create(parent: IProjectionNode | undefined): IProjectionNode;
  /** Whether changes should apply immediately. */
  instant(): boolean;
}

const nodes = new WeakMap<HTMLElement, IProjectionNode>();
const hosts = new WeakMap<IProjectionNode, LayoutHost>();
const mounted = new Set<IProjectionNode>();
const pending = new Map<HTMLElement, LayoutHost>();
/** Nodes that relevant mutations may have moved since the last commit. */
const touched = new Set<IProjectionNode>();
let scheduled = false;
let watcher: MutationObserver | undefined;

/** Defers node creation until the element is connected and its parent is known. */
export function adoptLayoutNode(element: HTMLElement, host: LayoutHost): void {
  pending.set(element, host);
  scheduleCommit();
}

export function dropLayoutNode(element: HTMLElement): void {
  pending.delete(element);

  const node = nodes.get(element);
  if (!node) return;

  nodes.delete(element);
  hosts.delete(node);
  mounted.delete(node);
  touched.delete(node);
  if (mounted.size === 0) watcher?.disconnect();

  // A follow node may share its animation through `resumingFrom`; only the lead
  // owns the animation and should stop it.
  const stack = node.getStack();
  if (!stack || node.isLead()) node.currentAnimation?.stop();

  node.unmount();
  scheduleCommit();
}

function scheduleCommit() {
  if (scheduled) return;
  scheduled = true;
  // Run after Solid's DOM writes and before paint. The projection engine flushes
  // its frame in the same checkpoint.
  queueMicrotask(commit);
}

/** Uses each node's previous measurement as the next update's snapshot. */
function commit() {
  scheduled = false;
  // Consume pending records so node mounting does not schedule a second commit
  // after this update has already been processed.
  absorb(watcher?.takeRecords() ?? []);

  const existing = anyRoot();
  if (existing) {
    beginUpdate(existing);
    for (const node of mounted) snapshot(node);
  }
  touched.clear();

  // Snapshot before mounting pending nodes so shared elements use the outgoing
  // member's previous box.
  mountPending();

  const root = anyRoot();
  if (!root) return;
  beginUpdate(root);
  root.didUpdate();
}

function snapshot(node: IProjectionNode) {
  if (node.snapshot || !node.instance || !node.layout) return;

  // An instant change has no snapshot, so the projection engine creates no
  // layout animation.
  if (hosts.get(node)?.instant()) {
    node.isLayoutDirty = true;
    return;
  }

  // Do not restart an in-flight animation unless a relevant mutation indicates
  // that the node moved again.
  if (node.currentAnimation && !touched.has(node)) return;

  node.snapshot = node.layout;
  node.isLayoutDirty = true;
  node.shouldResetTransform = true;
}

function mountPending() {
  if (pending.size === 0) return;

  // Mount ancestors before descendants so projection parents are available.
  const elements = [...pending.keys()].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );

  for (const element of elements) {
    const host = pending.get(element);
    pending.delete(element);
    if (!host || !element.isConnected) continue;

    const node = host.create(projectionParent(element));
    nodes.set(element, node);
    hosts.set(node, host);
    mounted.add(node);
    if (mounted.size === 1) watch();

    node.mount(element);
    node.isPresent = true;
    // The first measurement establishes the baseline; without a snapshot there
    // is no enter animation.
    node.isLayoutDirty = true;
  }
}

/** Watches document mutations that can move a projecting element. */
function watch() {
  watcher ??= new MutationObserver(onMutations);
  // Inline styles are written by the animation loop and must not reschedule it.
  watcher.observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}

function onMutations(records: MutationRecord[]) {
  absorb(records);
  scheduleCommit();
}

function absorb(records: MutationRecord[]) {
  for (const record of records) {
    for (const node of mounted) {
      if (movedBy(node, record)) touched.add(node);
    }
  }
}

/** Whether a mutation could have moved the node or one of its siblings. */
function movedBy(node: IProjectionNode, record: MutationRecord): boolean {
  const element = node.instance as HTMLElement | undefined;
  if (!element) return false;
  if (element.contains(record.target)) return true;
  return record.type === "childList" && record.target.contains(element);
}

function projectionParent(element: HTMLElement): IProjectionNode | undefined {
  let ancestor = element.parentElement;
  while (ancestor) {
    const node = nodes.get(ancestor);
    if (node?.instance) return node;
    ancestor = ancestor.parentElement;
  }
  return undefined;
}

/** Returns the shared projection root. */
function anyRoot(): IProjectionNode | undefined {
  for (const node of mounted) return node.root;
  return undefined;
}

function beginUpdate(root: IProjectionNode) {
  if (!root.isUpdating) root.startUpdate();
}
