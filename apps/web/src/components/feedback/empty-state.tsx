import type { JSX } from "solid-js";

import Inbox from "~/components/icons/inbox";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: JSX.Element;
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <div class="border border-border py-8 text-center">
      <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center bg-secondary">
        <Inbox class="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 class="mb-1 text-base font-medium text-foreground">{props.title}</h3>
      {props.description && (
        <p class="mb-3 text-sm text-muted-foreground">{props.description}</p>
      )}
      {props.action}
    </div>
  );
}
