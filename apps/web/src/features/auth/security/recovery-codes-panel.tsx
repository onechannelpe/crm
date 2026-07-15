import { For, createSignal } from "solid-js";

import { Button } from "~/components/ui/input/button";

import styles from "./security-enrollment-panel.module.css";

interface RecoveryCodesPanelProps {
  codes: string[];
}

export function RecoveryCodesPanel(props: RecoveryCodesPanelProps) {
  const [copied, setCopied] = createSignal(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(props.codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div class={styles.recovery}>
      <div class={styles.recoveryList}>
        <For each={props.codes}>
          {(code) => <div class={styles.mono}>{code}</div>}
        </For>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        class={styles.recoveryCopy}
        onClick={() => void copyAll()}
      >
        {copied() ? "Códigos copiados" : "Copiar códigos"}
      </Button>
    </div>
  );
}
