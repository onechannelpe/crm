import { Loader } from "~/components/feedback/loading/loader";

import styles from "./auth-loading-block.module.css";

interface AuthLoadingBlockProps {
  label: string;
}

export function AuthLoadingBlock(props: AuthLoadingBlockProps) {
  return (
    <output
      class={styles.block}
      aria-live="polite"
      aria-busy="true"
      aria-label={props.label}
    >
      <span class={styles.srOnly}>{props.label}</span>
      <Loader />
    </output>
  );
}
