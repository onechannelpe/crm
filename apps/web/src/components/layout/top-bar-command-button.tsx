import { cn } from "~/shared/classnames";

import { TopBarActionButton } from "./top-bar-action-button";
import { TopBarTooltip } from "./top-bar-tooltip";

import styles from "./top-bar-command-button.module.css";

interface TopBarCommandButtonProps {
  isOpen: boolean;
  modKey: string;
  onClick: () => void;
  dataClickOutsideId?: string;
}

export function TopBarCommandButton(props: TopBarCommandButtonProps) {
  const ariaLabel = () =>
    props.isOpen ? "Cerrar lista de comandos" : "Abrir lista de comandos";

  return (
    <TopBarTooltip content={ariaLabel()} align="end">
      <TopBarActionButton
        ariaLabel={ariaLabel()}
        hotkeys={`${props.modKey} K`}
        onClick={props.onClick}
        pressed={props.isOpen}
        dataTestId="page-header-command-button"
        dataClickOutsideId={props.dataClickOutsideId}
      >
        <svg
          class={cn(styles.icon, props.isOpen ? styles.open : styles.closed)}
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <circle
            cx="12"
            cy="12"
            r="1"
            class={cn(styles.dot, styles.centerDot)}
          />
          <path d="M12 12 L6 6" class={styles.line} />
          <path d="M12 12 L18 6" class={styles.line} />
          <path d="M12 12 L6 18" class={styles.line} />
          <path d="M12 12 L18 18" class={styles.line} />
          <circle cx="12" cy="5" r="1" class={cn(styles.dot, styles.topDot)} />
          <circle
            cx="12"
            cy="19"
            r="1"
            class={cn(styles.dot, styles.bottomDot)}
          />
        </svg>
      </TopBarActionButton>
    </TopBarTooltip>
  );
}
