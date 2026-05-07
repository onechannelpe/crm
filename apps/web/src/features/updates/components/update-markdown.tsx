import type { Component } from "solid-js";

import proseStyles from "~/components/layout/prose.module.css";

type UpdateMarkdownProps = {
  content: Component;
};

export function UpdateMarkdown(props: UpdateMarkdownProps) {
  const Content = props.content;

  return (
    <div class={proseStyles.prose}>
      <Content />
    </div>
  );
}
