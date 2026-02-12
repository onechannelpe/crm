import type { JSX } from "solid-js";

interface CardProps {
    children: JSX.Element;
    class?: string;
}

export function Card(props: CardProps) {
    return (
        <div class={`bg-white rounded-lg border border-gray-200 ${props.class || ""}`}>
            {props.children}
        </div>
    );
}

export function CardHeader(props: CardProps) {
    return (
        <div class={`px-6 py-4 border-b border-gray-200 ${props.class || ""}`}>
            {props.children}
        </div>
    );
}

export function CardContent(props: CardProps) {
    return <div class={`px-6 py-4 ${props.class || ""}`}>{props.children}</div>;
}
