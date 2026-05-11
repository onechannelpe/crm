import type { Component } from "solid-js";

import {
  Collapsible,
  UpdateLabel,
} from "~/features/updates/components/content-primitives";

import proseStyles from "~/components/layout/prose.module.css";

type UpdateMarkdownProps = {
  content: Component;
};

type UpdateMarkdownComponentsProps = {
  Collapsible: typeof Collapsible;
  UpdateLabel: typeof UpdateLabel;
};

export function UpdateMarkdown(props: UpdateMarkdownProps) {
  const Content = props.content as Component<{
    components?: UpdateMarkdownComponentsProps;
  }>;
  const components = {
    Collapsible,
    UpdateLabel,
  } satisfies UpdateMarkdownComponentsProps;

  return (
    <div class={`${proseStyles.prose} ${proseStyles.withNativeDetails}`}>
      <Content components={components} />
    </div>
  );
}
