import type { JSX } from "solid-js";
import { createUniqueId } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";

import styles from "./styles/content-primitives.module.css";

type CollapsibleProps = {
  title: string;
  children: JSX.Element;
  defaultOpen?: boolean;
};

export function Collapsible(props: CollapsibleProps) {
  const contentId = createUniqueId();
  return (
    <details
      class={`${styles.collapsible} updates-collapsible`}
      open={props.defaultOpen}
    >
      <summary class={styles.trigger} aria-controls={contentId}>
        <span class={styles.chevron} aria-hidden="true">
          <ChevronRight size={16} />
        </span>
        <span class={styles.title}>{props.title}</span>
      </summary>
      <div class={styles.content} id={contentId}>
        {props.children}
      </div>
    </details>
  );
}

type UpdateLabelProps = {
  color?: string;
  children: JSX.Element;
};

export function UpdateLabel(props: UpdateLabelProps) {
  const color = props.color ?? "#95a2b3";
  return (
    <span
      class={`${styles.label} updates-label`}
      style={{ "--update-label-color": color }}
    >
      {props.children}
    </span>
  );
}
