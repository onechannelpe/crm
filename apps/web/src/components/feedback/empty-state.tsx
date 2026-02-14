import type { JSX } from "solid-js";
import Inbox from "~/components/icons/inbox";

interface EmptyStateProps {
    title: string;
    description?: string;
    action?: JSX.Element;
}

export function EmptyState(props: EmptyStateProps) {
    return (
        <div class="text-center py-12">
            <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Inbox class="w-8 h-8 text-gray-400" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-1">{props.title}</h3>
            {props.description && (
                <p class="text-gray-500 text-sm mb-4">{props.description}</p>
            )}
            {props.action}
        </div>
    );
}
