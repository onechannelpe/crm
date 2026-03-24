import { type ParentProps, createSignal, onCleanup, onMount } from "solid-js";

export function SidePanelContainer(props: ParentProps) {
  const mq = window.matchMedia("(max-width: 768px)");
  const [isMobile, setIsMobile] = createSignal(mq.matches);

  onMount(() => {
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    onCleanup(() => mq.removeEventListener("change", handler));
  });

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        "min-height": "0",
        flex: "1",
        "max-height": isMobile() ? "calc(100% - 64px)" : "100%",
      }}
    >
      {props.children}
    </div>
  );
}
