import type { JSX } from "solid-js";

export type TabIconComponent = (props: {
  size?: number;
  class?: string;
}) => JSX.Element;
