import type { Component } from "solid-js";

import {
  Collapsible,
  UpdateLabel,
} from "~/features/updates/components/content-primitives";

import proseStyles from "~/components/layout/prose.module.css";

type UpdateMarkdownProps = {
  content: Component;
};

export function UpdateMarkdown(props: UpdateMarkdownProps) {
  const Content = props.content as Component<{
    components?: Record<string, unknown>;
  }>;

  return (
    <div class={proseStyles.prose}>
      <Content components={{ Collapsible, UpdateLabel }} />
    </div>
  );
}
