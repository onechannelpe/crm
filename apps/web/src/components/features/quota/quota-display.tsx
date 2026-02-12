import type { Component } from "solid-js";
import { Badge } from "~/components/ui/badge";

interface QuotaDisplayProps {
    used: number;
    total: number;
}

export const QuotaDisplay: Component<QuotaDisplayProps> = (props) => {
    const percentage = () => (props.total > 0 ? (props.used / props.total) * 100 : 0);
    const remaining = () => props.total - props.used;

    const variant = () => {
        const pct = percentage();
        if (pct >= 90) return "danger" as const;
        if (pct >= 70) return "warning" as const;
        return "success" as const;
    };

    return (
        <div class="bg-white border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">Cuota Diaria</span>
                <Badge variant={variant()}>
                    {props.used}/{props.total}
                </Badge>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                    class="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage()}%` }}
                />
            </div>
            <p class="text-xs text-gray-500 mt-2">
                {remaining()} leads restantes
            </p>
        </div>
    );
};
