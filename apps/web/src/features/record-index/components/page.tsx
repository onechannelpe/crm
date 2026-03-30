import type { JSX } from "solid-js";

export function RecordIndexPage(props: {
  children: JSX.Element;
  class?: string;
}) {
  return <div class={props.class}>{props.children}</div>;
}
