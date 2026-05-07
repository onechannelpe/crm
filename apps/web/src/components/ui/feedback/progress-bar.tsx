import styles from "./progress-bar.module.css";

interface ProgressBarProps {
  value: number;
  barColor?: string;
}

export function ProgressBar(props: ProgressBarProps) {
  const clamped = () => Math.max(0, Math.min(100, props.value));
  return (
    <div class={styles.root} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped()}>
      <div
        class={styles.bar}
        style={{
          width: `${clamped()}%`,
          "background-color": props.barColor,
        }}
      />
    </div>
  );
}
