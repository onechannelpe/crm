import { useParams } from "@solidjs/router";
import { type Component, createResource, Show, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";

import styles from "./docs.module.css";
import proseStyles from "~/components/layout/prose.module.css";

const docMdx = import.meta.glob<{ default: Component }>(
  "../../../../content/docs/*.mdx",
);

export default function DocSlugPage() {
  const params = useParams();

  const [Content] = createResource(
    () => params.slug,
    async (slug) => {
      const key = Object.keys(docMdx).find((k) => k.endsWith(`/${slug}.mdx`));
      if (!key) return undefined;
      return (await docMdx[key]()).default;
    },
  );

  return (
    <div class={styles.page}>
      <Suspense>
        <Show when={Content()}>
          {(C) => (
            <article class={styles.article}>
              <div class={proseStyles.prose}>
                <Dynamic component={C()} />
              </div>
            </article>
          )}
        </Show>
        <Show when={!Content.loading && !Content()}>
          <p
            style={{
              color: "#818181",
              "text-align": "center",
              "margin-top": "64px",
            }}
          >
            Página no encontrada.
          </p>
        </Show>
      </Suspense>
    </div>
  );
}
