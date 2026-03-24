import type { JSX, ParentProps } from "solid-js";
import { Show, children } from "solid-js";

import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { useNavigationDrawerState } from "~/features/navigation-drawer";

import styles from "./page-header.module.css";

interface PageHeaderProps extends ParentProps {
  title?: JSX.Element;
  icon?: JSX.Element;
  class?: string;
  isMobile?: boolean;
}

export function PageHeader(props: PageHeaderProps) {
  const { expanded, setExpanded } = useNavigationDrawerState();
  const title = children(() => props.title);
  const icon = children(() => props.icon);
  const actions = children(() => props.children);

  return (
    <header class={`${styles.topBar} ${props.class ?? ""}`}>
      <div class={styles.left}>
        <Show when={!props.isMobile && !expanded()}>
          <button
            type="button"
            class={styles.drawerExpandButton}
            onClick={() => setExpanded(true)}
            aria-label="Expandir barra lateral"
          >
            <LayoutSidebarRightCollapse size={14} />
          </button>
        </Show>

        <div class={styles.iconAndTitle}>
          <Show when={props.icon}>
            <div class={styles.icon}>{icon()}</div>
          </Show>
          <Show when={props.title}>
            <div class={styles.title} data-testid="top-bar-title">
              {title()}
            </div>
          </Show>
        </div>
      </div>

      <div class={styles.actions} data-click-outside-id="page-action-container">
        {actions()}
      </div>
    </header>
  );
}
