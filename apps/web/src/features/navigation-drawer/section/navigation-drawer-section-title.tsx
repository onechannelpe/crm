import ChevronRight from "~/components/icons/chevron-right";
import { cn } from "~/lib/utils";

import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";

import styles from "../navigation-drawer.module.css";

interface NavigationDrawerSectionTitleProps {
  label: string;
  onClick?: () => void;
  isOpen?: boolean;
}

export function NavigationDrawerSectionTitle(
  props: NavigationDrawerSectionTitleProps,
) {
  const { expanded } = useNavigationDrawerState();
  const isSettingsPage = useIsSettingsPage();
  const collapsedMain = () => !expanded() && !isSettingsPage();
  const isInteractive = () => Boolean(props.onClick) && !collapsedMain();
  const rootClass = () =>
    cn(
      styles.sectionTitle,
      isInteractive() && styles.sectionTitleClickable,
      collapsedMain() && styles.sectionTitleCollapsed,
    );
  const content = (
    <>
      <span class={styles.sectionTitleLabel}>{props.label}</span>
      {props.isOpen !== undefined ? (
        <span class={styles.sectionTitleChevron}>
          <ChevronRight
            size={12}
            style={{
              transform: props.isOpen ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
        </span>
      ) : null}
    </>
  );

  return (
    <>
      {props.onClick ? (
        <button
          type="button"
          class={rootClass()}
          onClick={() => {
            props.onClick?.();
          }}
          aria-expanded={props.isOpen}
        >
          {content}
        </button>
      ) : (
        <div class={rootClass()}>{content}</div>
      )}
    </>
  );
}
