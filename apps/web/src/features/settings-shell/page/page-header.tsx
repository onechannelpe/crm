import type { JSX, ParentProps } from "solid-js";
import { Show } from "solid-js";

import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { useNavigationDrawerState } from "~/features/navigation-drawer";

import styles from "./page-header.module.css";

interface PageHeaderProps extends ParentProps {
  title?: string | JSX.Element;
  class?: string;
  isMobile?: boolean;
  Icon?: (props: { size?: number; class?: string }) => JSX.Element;
}

export function PageHeader(props: PageHeaderProps) {
  const { expanded, setExpanded } = useNavigationDrawerState();

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
          {props.Icon ? (
            <div class={styles.iconContainer}>
              <props.Icon size={16} />
            </div>
          ) : null}
          {props.title ? (
            <div class={styles.title} data-testid="top-bar-title">
              {props.title}
            </div>
          ) : null}
        </div>
      </div>

      <div class={styles.actions}>{props.children}</div>
    </header>
  );
}
