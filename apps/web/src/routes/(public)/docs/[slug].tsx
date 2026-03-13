import { useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { getDocBySlug } from "~/features/docs/registry";

import styles from "./docs.module.css";
import proseStyles from "~/components/layout/prose.module.css";

export default function DocSlugPage() {
  const params = useParams();
  const doc = () => getDocBySlug(params.slug);

  return (
    <div class={styles.page}>
      <Show when={doc()}>
        {(entry) => {
          const Content = entry().content;
          return (
            <article class={styles.article}>
              <div class={proseStyles.prose}>
                <Content />
              </div>
            </article>
          );
        }}
      </Show>
      <Show when={!doc()}>
        <p class={styles.notFound}>Página no encontrada.</p>
      </Show>
    </div>
  );
}
