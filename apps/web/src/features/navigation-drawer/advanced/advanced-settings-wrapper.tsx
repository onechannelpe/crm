import type { ParentProps } from "solid-js";

import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
import { ADVANCED_SETTINGS_ANIMATION_DURATION } from "./advanced-settings-animation-durations";
import { AdvancedSettingsContentWrapperWithDot } from "./advanced-settings-content-wrapper-with-dot";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";

import styles from "./advanced-settings-wrapper.module.css";

type DotPosition = "top" | "centered";

interface AdvancedSettingsWrapperProps extends ParentProps {
  hideDot?: boolean;
  dotPosition?: DotPosition;
}

export function AdvancedSettingsWrapper(props: AdvancedSettingsWrapperProps) {
  const { advancedModeEnabled } = useNavigationDrawerState();

  return (
    <AnimatedExpandableContainer
      isExpanded={advancedModeEnabled()}
      duration={ADVANCED_SETTINGS_ANIMATION_DURATION.size}
    >
      <AdvancedSettingsContentWrapperWithDot
        hideDot={props.hideDot}
        dotPosition={props.dotPosition}
      >
        <div class={styles.content}>{props.children}</div>
      </AdvancedSettingsContentWrapperWithDot>
    </AnimatedExpandableContainer>
  );
}
