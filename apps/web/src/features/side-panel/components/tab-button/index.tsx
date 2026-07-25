import type { TabIconComponent } from "~/features/side-panel/components/tab-strip/types";
import { cn } from "~/shared/classnames";

import styles from "./styles.module.css";

type TabButtonProps = {
  title: string;
  icon?: TabIconComponent;
  active?: boolean;
  onClick?: () => void;
  dataTestId?: string;
};

export function TabButton(props: TabButtonProps) {
  return (
    <button
      type="button"
      data-testid={props.dataTestId}
      class={cn(styles.tabButton, props.active && styles.tabButtonActive)}
      onClick={props.onClick}
    >
      <TabButtonContent title={props.title} icon={props.icon} />
    </button>
  );
}

type TabMeasureProps = {
  title: string;
  icon?: TabIconComponent;
  ref?: (el: HTMLDivElement) => void;
};

export function TabMeasure(props: TabMeasureProps) {
  return (
    <div ref={props.ref} class={styles.tabMeasure}>
      <TabButtonContent title={props.title} icon={props.icon} />
    </div>
  );
}

type TabButtonContentProps = {
  title: string;
  icon?: TabIconComponent;
};

function TabButtonContent(props: TabButtonContentProps) {
  const Icon = props.icon;

  return (
    <span class={styles.tabHover}>
      {Icon && <Icon size={16} />}
      <span>{props.title}</span>
    </span>
  );
}
