import ChevronRight from "~/components/icons/chevron-right";
import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";
import { cn } from "~/lib/utils";

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

  return (
    <div
      class={cn(
        styles.sectionTitle,
        collapsedMain() && styles.sectionTitleCollapsed,
      )}
    >
      <span
        class={styles.sectionTitleLabel}
        onClick={() => {
          if (props.onClick && !collapsedMain()) {
            props.onClick();
          }
        }}
      >
        {props.label}
      </span>
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
    </div>
  );
}
