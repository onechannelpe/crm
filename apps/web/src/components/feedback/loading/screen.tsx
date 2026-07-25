import LoaderCircle from "~/components/icons/loader-circle";
import { cn } from "~/shared/classnames";

import styles from "./screen.module.css";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
}

export function Loading(props: LoadingProps) {
  const sizeClass = () => {
    switch (props.size) {
      case "sm":
        return styles.sm;
      case "lg":
        return styles.lg;
      default:
        return styles.md;
    }
  };

  return (
    <div class={styles.root}>
      <LoaderCircle class={cn(styles.spinner, sizeClass())} />
    </div>
  );
}
