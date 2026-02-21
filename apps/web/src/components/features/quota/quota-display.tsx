import type { Component } from "solid-js";

import { Badge } from "~/components/ui/display/badge";

interface QuotaDisplayProps {
  used: number;
  total: number;
}

export const QuotaDisplay: Component<QuotaDisplayProps> = (props) => {
  const percentage = () =>
    props.total > 0 ? (props.used / props.total) * 100 : 0;
  const remaining = () => props.total - props.used;

  const variant = () => {
    const pct = percentage();
    if (pct >= 90) return "destructive" as const;
    if (pct >= 70) return "warning" as const;
    return "success" as const;
  };

  return (
    <div class="border border-border p-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs text-muted-foreground">
          Daily quota
        </span>
        <Badge variant={variant()} class="px-2.5 py-1">
          {props.used}/{props.total}
        </Badge>
      </div>
      <div class="h-2 w-full rounded-full bg-secondary">
        <div
          class="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${percentage()}%` }}
        />
      </div>
      <p class="mt-2 text-sm text-muted-foreground">
        {remaining()} leads remaining today
      </p>
    </div>
  );
};
