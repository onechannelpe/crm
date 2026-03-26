import type { JSX, ParentProps } from "solid-js";
import { Show } from "solid-js";

import { useNavigationDrawerState } from "~/features/navigation-drawer/state/navigation-drawer-state";

import { Breadcrumb } from "./breadcrumb";
import type { BreadcrumbItem, MobileBackAction } from "./breadcrumb-model";
import { PageBody } from "./page-body";
import { PageHeader } from "./page-header";

import styles from "./sub-menu-top-bar-container.module.css";

interface SubMenuTopBarContainerProps extends ParentProps {
  breadcrumbItems: BreadcrumbItem[];
  mobileBackAction: MobileBackAction;
  title?: string | JSX.Element;
  reserveTitleSpace?: boolean;
  actionButton?: JSX.Element;
  class?: string;
}

export function SubMenuTopBarContainer(props: SubMenuTopBarContainerProps) {
  const { isMobile } = useNavigationDrawerState();

  return (
    <div class={`${styles.root} ${props.class ?? ""}`}>
      <PageHeader
        title={
          <Breadcrumb
            items={props.breadcrumbItems}
            mobileBackAction={props.mobileBackAction}
            isMobile={isMobile()}
          />
        }
      >
        {props.actionButton}
      </PageHeader>

      <PageBody>
        <Show when={props.title || props.reserveTitleSpace}>
          <h3 class={styles.pageTitle}>{props.title}</h3>
        </Show>
        {props.children}
      </PageBody>
    </div>
  );
}
