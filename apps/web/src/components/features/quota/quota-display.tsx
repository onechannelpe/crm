import type { Component } from "solid-js";

import { Badge } from "~/components/ui/badge";

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
    <div class="crm-surface rounded-3xl p-5">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Cuota diaria
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
        {remaining()} leads restantes para hoy
      </p>
    </div>
  );
};
