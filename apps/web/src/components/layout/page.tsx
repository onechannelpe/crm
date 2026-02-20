import type { JSX } from "solid-js";
import { Show } from "solid-js";

import { cn } from "~/lib/utils";

interface BaseProps {
  children: JSX.Element;
  class?: string;
}

interface HeaderProps {
  class?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: JSX.Element;
}

interface SectionTitleProps {
  class?: string;
  title: string;
  description?: string;
  actions?: JSX.Element;
}

export function AppPage(props: BaseProps) {
  return <div class={cn("space-y-6 pb-8", props.class)}>{props.children}</div>;
}

export function AppPageHeader(props: HeaderProps) {
  return (
    <header class={cn("crm-surface rounded-3xl p-6 md:p-7", props.class)}>
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Show when={props.eyebrow}>
            {(eyebrow) => (
              <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {eyebrow()}
              </p>
            )}
          </Show>
          <h1 class="mt-1 text-3xl font-semibold text-foreground md:text-4xl">
            {props.title}
          </h1>
          <Show when={props.description}>
            {(description) => (
              <p class="mt-2 max-w-[760px] text-sm text-muted-foreground md:text-base">
                {description()}
              </p>
            )}
          </Show>
        </div>
        <Show when={props.actions}>
          <div class="flex items-center gap-2">{props.actions}</div>
        </Show>
      </div>
    </header>
  );
}

export function AppPageSection(props: BaseProps) {
  return (
    <section class={cn("crm-surface rounded-3xl p-4 md:p-5", props.class)}>
      {props.children}
    </section>
  );
}

export function AppInsetPanel(props: BaseProps) {
  return (
    <div
      class={cn(
        "rounded-2xl border border-border/80 bg-surface p-3",
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}

export function AppPageSectionTitle(props: SectionTitleProps) {
  return (
    <div
      class={cn("mb-3 flex items-center justify-between gap-3", props.class)}
    >
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {props.title}
        </h2>
        <Show when={props.description}>
          {(description) => (
            <p class="mt-1 text-xs text-muted-foreground">{description()}</p>
          )}
        </Show>
      </div>
      <Show when={props.actions}>{(actions) => <div>{actions()}</div>}</Show>
    </div>
  );
}
