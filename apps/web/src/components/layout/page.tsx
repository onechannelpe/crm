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
  return <div class={cn("space-y-3 pb-4", props.class)}>{props.children}</div>;
}

export function AppPageHeader(props: HeaderProps) {
  return (
    <header class={cn("px-1 pt-1 pb-2", props.class)}>
      <div class="flex items-center justify-end">
        <Show when={props.actions}>{(actions) => <div class="flex items-center gap-2">{actions()}</div>}</Show>
      </div>
    </header>
  );
}

export function AppPageSection(props: BaseProps) {
  return (
    <section
      class={cn("tw-record-index-panel p-4", props.class)}
    >
      {props.children}
    </section>
  );
}

export function AppInsetPanel(props: BaseProps) {
  return (
    <div class={cn("border border-border px-3 py-2", props.class)}>
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
        <h2 class="text-[13px] font-medium text-foreground">
          {props.title}
        </h2>
        <Show when={props.description}>
          {(description) => (
            <p class="mt-1 text-[12px] text-muted-foreground">{description()}</p>
          )}
        </Show>
      </div>
      <Show when={props.actions}>{(actions) => <div>{actions()}</div>}</Show>
    </div>
  );
}
