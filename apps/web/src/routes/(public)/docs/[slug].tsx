import { useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { docsBySlug, isDocSlug } from "~/features/docs/registry";

import styles from "./docs.module.css";
import proseStyles from "~/components/layout/prose.module.css";

export default function DocSlugPage() {
  const params = useParams();
  const doc = () => {
    const slug = params.slug;
    if (!slug || !isDocSlug(slug)) return undefined;
    return docsBySlug[slug];
  };

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
