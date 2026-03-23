import { A } from "@solidjs/router";
import { Show } from "solid-js";

import ChevronLeft from "~/components/icons/chevron-left";
import { useNavigationDrawerState } from "~/features/navigation-drawer";

import type { MobileBackAction } from "./breadcrumb-model";

import styles from "./breadcrumb.module.css";

interface MobileBackControlProps {
  action: MobileBackAction;
  class?: string;
}

export function MobileBackControl(props: MobileBackControlProps) {
  const { setExpanded, setCurrentMobileDrawer } = useNavigationDrawerState();

  const openSettingsDrawer = () => {
    setExpanded(true);
    setCurrentMobileDrawer("settings");
  };

  if (props.action.kind === "none") {
    return null;
  }

  return (
    <nav class={`${styles.root} ${props.class ?? ""}`} aria-label="Breadcrumb">
      <ChevronLeft size={16} />
      {props.action.kind === "open-settings-drawer" ? (
        <button
          type="button"
          class={styles.mobileBack}
          onClick={openSettingsDrawer}
        >
          {props.action.label}
        </button>
      ) : (
        <Show
          when={props.action.kind === "link" ? props.action : undefined}
          keyed
        >
          {(action) => (
            <A class={styles.link} href={action.href} title={action.label}>
              {action.label}
            </A>
          )}
        </Show>
      )}
    </nav>
  );
}
