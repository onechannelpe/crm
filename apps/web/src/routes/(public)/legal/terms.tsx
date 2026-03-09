import TermsContent from "../../../../content/legal/terms.mdx";

import styles from "./legal.module.css";

export default function TermsPage() {
  return (
    <div class={styles.page}>
      <article class={styles.article}>
        <h1 class={styles.title}>Términos de uso</h1>
        <div class={styles.body}>
          <TermsContent />
        </div>
      </article>
    </div>
  );
}
