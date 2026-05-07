import {
  createMemo,
  createUniqueId,
  onCleanup,
  onMount,
  type Accessor,
  useContext,
} from "solid-js";

import { PresenceContext } from "./presence-context";

type AlwaysPresent = [Accessor<boolean>, null];
type Present = [Accessor<boolean>];
type NotPresent = [Accessor<boolean>, () => void];

export function usePresence(subscribe = true): AlwaysPresent | Present | NotPresent {
  const context = useContext(PresenceContext);
  if (context === null) return [() => true, null];

  const id = createUniqueId();
  let unregister: (() => void) | undefined;
  const isPresent = createMemo(() => context.isPresent());

  onMount(() => {
    if (!subscribe) return;
    unregister = context.register(id);
  });

  onCleanup(() => unregister?.());

  const safeToRemove = () => {
    if (!subscribe) return;
    context.onExitComplete?.(id);
  };

  return !isPresent() && context.onExitComplete ? [isPresent, safeToRemove] : [isPresent];
}

export function useIsPresent(): boolean {
  const context = useContext(PresenceContext);
  return context === null ? true : context.isPresent();
}
