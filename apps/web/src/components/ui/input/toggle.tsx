import { springTransform } from "~/components/ui/animation/spring-transform";
import { cn } from "~/shared/classnames";

import styles from "./toggle.module.css";

export function Toggle(props: {
  value?: boolean;
  disabled?: boolean;
  id?: string;
  ariaLabel: string;
  onChange?: (value: boolean) => void;
}) {
  const circleTransform = () => `translateX(${props.value ? 14 : 2}px)`;
  const initialCircleTransform = circleTransform();

  return (
    <label
      aria-label={props.ariaLabel}
      class={cn(
        styles.track,
        props.value && styles.trackOn,
        props.disabled && styles.disabled,
      )}
    >
      <input
        id={props.id}
        type="checkbox"
        class={styles.input}
        checked={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange?.(event.currentTarget.checked)}
      />
      <span
        ref={springTransform(circleTransform)}
        class={styles.circle}
        style={{ transform: initialCircleTransform }}
      />
    </label>
  );
}
