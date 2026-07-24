import { Show, children, type ParentProps } from "solid-js";

import { cn } from "~/lib/utils";

import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

import styles from "./navigation-drawer-animated-collapse-wrapper.module.css";

export function NavigationDrawerAnimatedCollapseWrapper(props: ParentProps) {
  const isSettingsPage = useIsSettingsPage();
  const { expanded } = useNavigationDrawerState();
  const content = children(() => props.children);

  return (
    <Show when={!isSettingsPage()} fallback={content()}>
      <span class={cn(styles.wrapper, !expanded() && styles.wrapperCollapsed)}>
        {content()}
      </span>
    </Show>
  );
}
