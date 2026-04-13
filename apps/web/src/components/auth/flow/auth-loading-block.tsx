import { Loader } from "~/components/feedback/loading/loader";

import styles from "./auth-loading-block.module.css";

interface AuthLoadingBlockProps {
  label: string;
}

export function AuthLoadingBlock(props: AuthLoadingBlockProps) {
  return (
    <div class={styles.block} role="status" aria-live="polite" aria-busy="true">
      <span class={styles.srOnly}>{props.label}</span>
      <Loader />
    </div>
  );
}
