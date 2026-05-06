import type { JSX } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./styles.module.css";

type TabIconComponent = (props: {
  size?: number;
  class?: string;
}) => JSX.Element;

type TabButtonProps = {
  id: string;
  title: string;
  LeftIcon?: TabIconComponent;
  active?: boolean;
  onClick?: () => void;
  dataTestId?: string;
};

export function TabButton(props: TabButtonProps) {
  const Icon = props.LeftIcon;

  return (
    <button
      type="button"
      data-testid={props.dataTestId}
      class={cn(styles.tabButton, props.active && styles.tabButtonActive)}
      onClick={props.onClick}
    >
      <span class={styles.tabHover}>
        {Icon && <Icon size={16} />}
        <span>{props.title}</span>
      </span>
    </button>
  );
}

type TabMeasureProps = {
  title: string;
  LeftIcon?: TabIconComponent;
  ref?: (el: HTMLDivElement) => void;
};

export function TabMeasure(props: TabMeasureProps) {
  const Icon = props.LeftIcon;

  return (
    <div ref={props.ref} class={styles.tabMeasure}>
      <span class={styles.tabHover}>
        {Icon && <Icon size={16} />}
        <span>{props.title}</span>
      </span>
    </div>
  );
}
