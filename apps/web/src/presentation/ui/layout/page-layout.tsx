import type { JSX } from "solid-js";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface PageLayoutProps {
  children: JSX.Element;
}

export function PageLayout(props: PageLayoutProps) {
  return (
    <div class="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div class="flex-1 ml-64 flex flex-col min-h-screen">
        <Header />
        <main class="flex-1 p-8 overflow-y-auto">
          <div class="max-w-7xl mx-auto w-full">{props.children}</div>
        </main>
      </div>
    </div>
  );
}
