import type { RouteSectionProps } from "@solidjs/router";

import { Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { ToastContainer } from "~/components/feedback/toast";
import { ToastProvider } from "~/components/feedback/toast-provider";
import { Header } from "~/components/layout/header";
import { Sidebar } from "~/components/layout/sidebar";
import { SessionProvider } from "~/components/providers/session-provider";

export default function AppLayout(props: RouteSectionProps) {
  return (
    <ToastProvider>
      <SessionProvider>
        <div class="min-h-screen bg-muted/20 flex font-sans text-foreground">
          <Sidebar />
          <div class="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
            <Header />
            <main class="flex-1 p-4 md:p-8 overflow-y-auto">
              <div class="max-w-400 mx-auto w-full">
                <Suspense fallback={<Loading />}>{props.children}</Suspense>
              </div>
            </main>
          </div>
        </div>
      </SessionProvider>
      <ToastContainer />
    </ToastProvider>
  );
}
