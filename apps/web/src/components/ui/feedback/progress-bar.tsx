import styles from "./progress-bar.module.css";

interface ProgressBarProps {
  value: number;
  barColor?: string;
}

export function ProgressBar(props: ProgressBarProps) {
  const clamped = () => Math.max(0, Math.min(100, props.value));
  return (
    <progress
      class={styles.root}
      value={clamped()}
      max={100}
      style={{ "--progress-color": props.barColor }}
    />
  );
}
