import styles from "./progress-bar.module.css";

interface ProgressBarProps {
  value: number;
  barColor?: string;
}

export function ProgressBar(props: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, props.value));
  return (
    <div class={styles.root}>
      <div
        class={styles.bar}
        style={{
          width: `${clamped}%`,
          "background-color": props.barColor,
        }}
      />
    </div>
  );
}
