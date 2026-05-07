import type { Component } from "solid-js";

import proseStyles from "~/components/layout/prose.module.css";

type ReleaseMarkdownProps = {
  content: Component;
};

export function ReleaseMarkdown(props: ReleaseMarkdownProps) {
  const Content = props.content;

  return (
    <div class={proseStyles.prose}>
      <Content />
    </div>
  );
}
