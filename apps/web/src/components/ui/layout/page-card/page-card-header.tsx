import { Show, children, type JSX } from "solid-js";

import LayoutSidebarLeftExpand from "~/components/icons/layout-sidebar-left-expand";
import { useNavigationDrawerState } from "~/features/navigation-drawer/state/navigation-drawer-provider";
import { cn } from "~/shared/classnames";

import styles from "./page-card-header.module.css";

interface PageCardHeaderProps {
  breadcrumb?: JSX.Element;
  icon?: JSX.Element;
  title?: JSX.Element | string;
  tag?: JSX.Element;
  actionButton?: JSX.Element;
  centerTitle?: boolean;
}

export function PageCardHeader(props: PageCardHeaderProps) {
  const { isMobile, expanded, setExpanded } = useNavigationDrawerState();

  const icon = children(() => props.icon);
  const tag = children(() => props.tag);
  const title = children(() => props.title);
  const breadcrumb = children(() => props.breadcrumb);
  const actionButton = children(() => props.actionButton);

  const hasTitleContent = () =>
    !isMobile() && (Boolean(icon()) || title() != null || Boolean(tag()));
  const shouldCenterTitle = () =>
    Boolean(props.centerTitle) && hasTitleContent();

  const titleContent = () => (
    <>
      {icon()}
      <Show when={title() != null}>
        <span>{title()}</span>
      </Show>
      {tag()}
    </>
  );

  return (
    <div
      class={cn(styles.header, !shouldCenterTitle() && styles.headerNoCenter)}
    >
      <div class={styles.left}>
        <Show when={!expanded()}>
          <button
            type="button"
            class={styles.collapseButton}
            onClick={() => setExpanded(true)}
            aria-label="Expandir barra lateral"
          >
            <LayoutSidebarLeftExpand size={16} />
          </button>
        </Show>
        {breadcrumb()}
        <Show when={!shouldCenterTitle() && hasTitleContent()}>
          <div class={styles.title}>{titleContent()}</div>
        </Show>
      </div>

      <Show when={shouldCenterTitle()}>
        <div class={cn(styles.title, styles.centeredTitle)}>
          {titleContent()}
        </div>
      </Show>

      <div
        class={cn(styles.right, !shouldCenterTitle() && styles.rightNoCenter)}
        data-click-outside-id="page-action-container"
      >
        {actionButton()}
      </div>
    </div>
  );
}
