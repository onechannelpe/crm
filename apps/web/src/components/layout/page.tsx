import type { JSX } from "solid-js";
import { Show } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./page.module.css";

interface BaseProps {
  children: JSX.Element;
  class?: string;
}

interface HeaderProps {
  class?: string;
  eyebrow?: string;
  title?: string;
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
  return <div class={cn(styles.page, props.class)}>{props.children}</div>;
}

export function AppPageHeader(props: HeaderProps) {
  return (
    <header class={cn(styles.header, props.class)}>
      <Show when={props.actions}>
        {(actions) => <div class={styles.headerActions}>{actions()}</div>}
      </Show>
    </header>
  );
}

export function AppPageSection(props: BaseProps) {
  return (
    <section class={cn(styles.section, props.class)}>
      <div class={styles.sectionBody}>{props.children}</div>
    </section>
  );
}

export function AppInsetPanel(props: BaseProps) {
  return <div class={cn(styles.insetPanel, props.class)}>{props.children}</div>;
}

export function AppPageSectionTitle(props: SectionTitleProps) {
  return (
    <div class={cn(styles.sectionTitle, props.class)}>
      <div>
        <h2 class={styles.title}>{props.title}</h2>
        <Show when={props.description}>
          {(description) => <p class={styles.description}>{description()}</p>}
        </Show>
      </div>
      <Show when={props.actions}>{(actions) => <div>{actions()}</div>}</Show>
    </div>
  );
}
