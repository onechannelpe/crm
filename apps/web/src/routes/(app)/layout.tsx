import type { RouteSectionProps } from "@solidjs/router";
import Header from "~/components/layout/header";

export default function AppLayout(props: RouteSectionProps) {
  return (
    <div class="min-h-screen bg-gray-50">
      <Header />
      <main class="max-w-7xl mx-auto px-6 py-8">{props.children}</main>
    </div>
  );
}
