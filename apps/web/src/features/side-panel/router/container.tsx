import type { ParentProps } from "solid-js";

export function Container(props: ParentProps<{ isMobile: boolean }>) {
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        "min-height": "0",
        flex: "1",
        "max-height": props.isMobile ? "calc(100% - 64px)" : "100%",
      }}
    >
      {props.children}
    </div>
  );
}
