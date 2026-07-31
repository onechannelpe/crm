import { clsx } from "clsx";
import { Show, createEffect, createSignal, on } from "solid-js";

import styles from "./avatar.module.css";

interface AvatarProps {
  imageUrl: string | null;
  fallback: string;
  class?: string;
  imageClass?: string;
  fallbackClass?: string;
}

export function Avatar(props: AvatarProps) {
  const [hasImageError, setHasImageError] = createSignal(false);

  createEffect(
    on(
      () => props.imageUrl,
      () => {
        setHasImageError(false);
      },
    ),
  );

  const showImage = () => Boolean(props.imageUrl) && !hasImageError();

  return (
    <span class={clsx(styles.root, props.class)} aria-hidden="true">
      <Show
        when={showImage()}
        fallback={
          <span class={clsx(styles.fallback, props.fallbackClass)}>
            {props.fallback}
          </span>
        }
      >
        <img
          src={props.imageUrl ?? undefined}
          alt=""
          class={clsx(styles.image, props.imageClass)}
          onError={() => setHasImageError(true)}
        />
      </Show>
    </span>
  );
}
