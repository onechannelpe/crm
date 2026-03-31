import type { ParentProps } from "solid-js";

import { useRecordIndexSetup } from "../context/setup-context";

export function RecordIndexLayout(props: ParentProps) {
  const setup = useRecordIndexSetup();

  return <div class={setup.class}>{props.children}</div>;
}
