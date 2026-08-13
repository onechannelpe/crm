import { clsx } from "clsx";

import type { TabIconComponent } from "~/features/side-panel/components/tab-strip/types";

import styles from "./styles.module.css";

export function TabButton(props: {
  title: string;
  icon?: TabIconComponent;
  pill?: string;
  active?: boolean;
  onClick?: () => void;
  dataTestId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={props.dataTestId}
      class={clsx(styles.tabButton, props.active && styles.tabButtonActive)}
      onClick={props.onClick}
    >
      <TabButtonContent
        title={props.title}
        icon={props.icon}
        pill={props.pill}
      />
    </button>
  );
}

export function TabMeasure(props: {
  title: string;
  icon?: TabIconComponent;
  pill?: string;
  ref?: (el: HTMLDivElement) => void;
}) {
  return (
    <div ref={props.ref} class={styles.tabMeasure}>
      <TabButtonContent
        title={props.title}
        icon={props.icon}
        pill={props.pill}
      />
    </div>
  );
}

function TabButtonContent(props: {
  title: string;
  icon?: TabIconComponent;
  pill?: string;
}) {
  const Icon = props.icon;

  return (
    <span class={styles.tabHover}>
      {Icon && <Icon size={16} />}
      <span>{props.title}</span>
      {props.pill && <span class={styles.pill}>{props.pill}</span>}
    </span>
  );
}
