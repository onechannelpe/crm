import { clsx } from "clsx";
import { Show, createEffect, createSignal, on } from "solid-js";

import { avatarPlaceholderColors } from "./avatar-placeholder-color";

import styles from "./avatar.module.css";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarType = "squared" | "rounded";

interface AvatarProps {
  imageUrl: string | null;
  fallback: string;
  /*
    Seeds the placeholder tint. Pass a stable record id so one record keeps one
    colour everywhere it appears; defaults to the fallback text, which drifts
    when a name is edited.
  */
  placeholderColorSeed?: string;
  size?: AvatarSize;
  type?: AvatarType;
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

  /*
    The tint rides on the placeholder rather than the root so callers that style
    the root with their own background keep winning. An image fills the box edge
    to edge anyway, so a tint behind it would only fringe transparent logos.
  */
  const placeholderStyle = () => {
    if (props.placeholderColorSeed === undefined) {
      return undefined;
    }

    const { background, foreground } = avatarPlaceholderColors(
      props.placeholderColorSeed,
    );

    return { "--avatar-background": background, "--avatar-color": foreground };
  };

  return (
    <span
      class={clsx(styles.root, props.size && styles[props.size], props.class)}
      data-type={props.type}
      aria-hidden="true"
    >
      <Show
        when={showImage()}
        fallback={
          <span
            class={clsx(styles.fallback, props.fallbackClass)}
            style={placeholderStyle()}
          >
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
