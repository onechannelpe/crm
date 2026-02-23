import type { JSX } from "solid-js";
import { Show } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./page.module.css";

type PageWidth = "narrow" | "medium" | "wide";

const WIDTH_CLASS: Record<PageWidth, string> = {
  narrow: styles.pageNarrow,
  medium: styles.pageMedium,
  wide: styles.pageWide,
};

interface BaseProps {
  children: JSX.Element;
  class?: string;
}

interface PageProps extends BaseProps {
  width?: PageWidth;
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

export function AppPage(props: PageProps) {
  return (
    <div
      class={cn(
        styles.page,
        props.width ? WIDTH_CLASS[props.width] : undefined,
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}

export function AppPageHeader(props: HeaderProps) {
  const hasMeta = () => !!(props.eyebrow || props.title || props.description);
  return (
    <header
      class={cn(styles.header, hasMeta() && styles.headerWithMeta, props.class)}
    >
      <Show when={hasMeta()}>
        <div class={styles.headerMeta}>
          <Show when={props.eyebrow}>
            {(eyebrow) => <p class={styles.headerEyebrow}>{eyebrow()}</p>}
          </Show>
          <Show when={props.title}>
            {(title) => <h1 class={styles.headerTitle}>{title()}</h1>}
          </Show>
          <Show when={props.description}>
            {(description) => (
              <p class={styles.headerDescription}>{description()}</p>
            )}
          </Show>
        </div>
      </Show>
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
