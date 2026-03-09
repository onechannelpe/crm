import PrivacyContent from "../../../../content/legal/privacy.mdx";

import styles from "./legal.module.css";

export default function PrivacyPage() {
  return (
    <div class={styles.page}>
      <article class={styles.article}>
        <h1 class={styles.title}>Privacidad</h1>
        <div class={styles.body}>
          <PrivacyContent />
        </div>
      </article>
    </div>
  );
}
