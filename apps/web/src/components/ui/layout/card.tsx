import type { JSX } from "solid-js";

import { cn } from "~/lib/utils";

interface CardProps {
  children?: JSX.Element;
  class?: string;
}

export function Card(props: CardProps) {
  return (
    <div
      class={cn(
        "rounded-3xl border border-border/85 bg-card/90 text-card-foreground shadow-elevation-2 backdrop-blur",
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}

export function CardHeader(props: CardProps) {
  return (
    <div class={cn("flex flex-col space-y-1.5 p-7", props.class)}>
      {props.children}
    </div>
  );
}

export function CardTitle(props: CardProps) {
  return (
    <h3
      class={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        props.class,
      )}
    >
      {props.children}
    </h3>
  );
}

export function CardDescription(props: CardProps) {
  return (
    <p class={cn("text-sm text-muted-foreground", props.class)}>
      {props.children}
    </p>
  );
}

export function CardContent(props: CardProps) {
  return <div class={cn("p-7 pt-0", props.class)}>{props.children}</div>;
}

export function CardFooter(props: CardProps) {
  return (
    <div class={cn("flex items-center p-7 pt-0", props.class)}>
      {props.children}
    </div>
  );
}
