import type { JSX } from "solid-js";
import { Show } from "solid-js";

import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";

import { hasPermission, type Permission } from "./rbac";

interface ProtectedSectionProps {
  permission: Permission;
  children: JSX.Element;
  fallback?: JSX.Element;
}

export function ProtectedSection(props: ProtectedSectionProps) {
  const { currentUser } = useAuthenticatedSession();
  return (
    <Show
      when={hasPermission(currentUser().role, props.permission)}
      fallback={props.fallback}
    >
      {props.children}
    </Show>
  );
}
