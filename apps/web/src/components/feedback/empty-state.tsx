import type { JSX } from "solid-js";

import Inbox from "~/components/icons/inbox";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: JSX.Element;
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <div class="crm-surface rounded-3xl py-10 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <Inbox class="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 class="mb-1 text-lg font-semibold text-foreground">{props.title}</h3>
      {props.description && (
        <p class="mb-4 text-sm text-muted-foreground">{props.description}</p>
      )}
      {props.action}
    </div>
  );
}
