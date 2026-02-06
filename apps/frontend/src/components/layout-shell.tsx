import type { JSX, ParentProps } from "solid-js";
import Header from "./header";

interface LayoutShellProps extends ParentProps {
  sidebar: JSX.Element;
}

export default function LayoutShell(props: LayoutShellProps) {
  return (
    <div class="min-h-screen bg-white font-sans flex flex-col">
      <Header />

      <div class="flex flex-1 h-[calc(100vh-57px)] overflow-hidden">
        <aside class="w-80 shrink-0 border-r border-gray-200 bg-white hidden md:flex flex-col z-10 overflow-y-auto custom-scrollbar">
          {props.sidebar}
        </aside>

        <main class="flex-1 overflow-y-auto bg-[#F9FAFB]">
          <div class="max-w-6xl mx-auto px-6 py-8">{props.children}</div>
        </main>
      </div>
    </div>
  );
}
