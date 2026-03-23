import type { JSX, ParentProps } from "solid-js";
import { Show, children } from "solid-js";

import LayoutSidebarRightCollapse from "~/components/icons/layout-sidebar-right-collapse";
import { useNavigationDrawerState } from "~/features/navigation-drawer";

import styles from "./page-header.module.css";

interface PageHeaderProps extends ParentProps {
  left: JSX.Element;
  class?: string;
  isMobile?: boolean;
}

export function PageHeader(props: PageHeaderProps) {
  const { expanded, setExpanded } = useNavigationDrawerState();
  const left = children(() => props.left);
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
          <div class={styles.title} data-testid="top-bar-title">
            {left()}
          </div>
        </div>
      </div>

      <div class={styles.actions}>{actions()}</div>
    </header>
  );
}
