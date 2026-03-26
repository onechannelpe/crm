import type { ParentProps } from "solid-js";
import { Show } from "solid-js";

import Point from "~/components/icons/point";

import styles from "./advanced-settings-content-wrapper-with-dot.module.css";

type DotPosition = "top" | "centered";

interface AdvancedSettingsContentWrapperWithDotProps extends ParentProps {
  hideDot?: boolean;
  dotPosition?: DotPosition;
}

export function AdvancedSettingsContentWrapperWithDot(
  props: AdvancedSettingsContentWrapperWithDotProps,
) {
  const dotPosition = () => props.dotPosition ?? "centered";

  return (
    <div class={styles.wrapper}>
      <Show when={!props.hideDot}>
        <div
          class={
            dotPosition() === "top"
              ? `${styles.dotContainer} ${styles.dotContainerTop}`
              : styles.dotContainer
          }
        >
          <span class={styles.iconPointContainer}>
            <Point
              size={12}
              color="var(--warning)"
              fill="var(--warning)"
              strokeWidth={2}
            />
          </span>
        </div>
      </Show>
      {props.children}
    </div>
  );
}
