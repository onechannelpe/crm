import { A } from "@solidjs/router";
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";

import XIcon from "~/components/icons/x";

import styles from "./drawer-primitives.module.css";

const PANEL_PAGE_SIZE = 5;

interface FieldRowProps {
  label: string;
  value: string | null | undefined;
  icon: JSX.Element;
}

export function FieldRow(props: FieldRowProps) {
  return (
    <Show when={props.value?.trim()}>
      {(value) => (
        <div class={styles.fieldRow}>
          <span class={styles.fieldIcon}>{props.icon}</span>
          <span class={styles.fieldLabel}>{props.label}</span>
          <span class={styles.fieldValue} title={value()}>
            {value()}
          </span>
        </div>
      )}
    </Show>
  );
}

interface DetailSectionProps {
  title: string;
  linkHref?: string;
  linkLabel?: string;
  children: JSX.Element;
}

export function DetailSection(props: DetailSectionProps) {
  return (
    <section class={styles.section}>
      <header class={styles.sectionHeader}>
        <div class={styles.sectionTitleWrap}>
          <h3 class={styles.sectionTitle}>{props.title}</h3>
          <Show when={props.linkHref && props.linkLabel}>
            <A href={props.linkHref!} class={styles.sectionLink}>
              {props.linkLabel}
            </A>
          </Show>
        </div>
      </header>
      <div class={styles.sectionBody}>{props.children}</div>
    </section>
  );
}

interface ExpandablePillListProps {
  items: readonly string[];
}

export function ExpandablePillList(props: ExpandablePillListProps) {
  const [visibleCount, setVisibleCount] = createSignal(PANEL_PAGE_SIZE);
  const visibleItems = createMemo(() => props.items.slice(0, visibleCount()));
  const hiddenCount = createMemo(() =>
    Math.max(0, props.items.length - visibleItems().length),
  );

  return (
    <div class={styles.pillWrap}>
      <For each={visibleItems()}>
        {(item) => (
          <span class={styles.pill} title={item}>
            <span class={styles.pillText}>{item}</span>
          </span>
        )}
      </For>
      <Show when={hiddenCount() > 0}>
        <button
          type="button"
          class={`${styles.pill} ${styles.pillButton}`}
          onClick={() => setVisibleCount((count) => count + PANEL_PAGE_SIZE)}
        >
          +{hiddenCount()} más
        </button>
      </Show>
    </div>
  );
}

interface DrawerHeaderProps {
  initial: string;
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  squareAvatar?: boolean;
  enrichment?: {
    status: string | null | undefined;
    onRequest: () => void;
  };
}

export function DrawerHeader(props: DrawerHeaderProps) {
  const squareClass = () =>
    props.squareAvatar ? ` ${styles.headerAvatarSquare}` : "";
  const enrichStatus = () => props.enrichment?.status;
  const isProcessing = () =>
    enrichStatus() === "queued" || enrichStatus() === "running";
  // Clickable when enrichment is available and not already completed or in-flight
  const clickableEnrichment = () =>
    props.enrichment && !isProcessing() && enrichStatus() !== "completed"
      ? props.enrichment
      : null;

  return (
    <header class={styles.header}>
      <Show
        when={clickableEnrichment()}
        fallback={
          <span
            class={`${styles.headerAvatar}${squareClass()}${isProcessing() ? ` ${styles.headerAvatarPending}` : ""}`}
          >
            {props.initial}
          </span>
        }
      >
        {(enrich) => (
          <button
            type="button"
            class={`${styles.headerAvatar}${squareClass()} ${styles.headerAvatarClickable}`}
            onClick={enrich().onRequest}
            title="Solicitar enriquecimiento"
            aria-label="Solicitar enriquecimiento"
          >
            {props.initial}
          </button>
        )}
      </Show>
      <div class={styles.headerInfo}>
        <div class={styles.headerName} title={props.title}>
          {props.title}
        </div>
        <Show when={props.subtitle?.trim()}>
          {(subtitle) => (
            <div class={styles.headerSubtitle} title={subtitle()}>
              {subtitle()}
            </div>
          )}
        </Show>
      </div>
      <button
        class={styles.closeBtn}
        onClick={props.onClose}
        aria-label="Cerrar"
      >
        <XIcon size={14} />
      </button>
    </header>
  );
}

export { styles };
