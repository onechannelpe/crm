import { Title } from "@solidjs/meta";
import { type RouteSectionProps } from "@solidjs/router";
import { Suspense } from "solid-js";

import { AppHeaderActions } from "~/components/layout/app-header/app-header-actions";
import { PageCardLayout } from "~/components/ui/layout/page-card/page-card-layout";
import { MerchantGpvHeader } from "~/features/merchant-stats/merchant-gpv-header";

import { MerchantGpvShellSkeleton } from "./skeletons/merchant-gpv-shell-skeleton";

export function MerchantGpvShell(props: RouteSectionProps) {
  return (
    <>
      <Title>GPV de comercios</Title>
      <PageCardLayout
        header={
          <MerchantGpvHeader title="GPV de comercios">
            <AppHeaderActions />
          </MerchantGpvHeader>
        }
      >
        <Suspense fallback={<MerchantGpvShellSkeleton />}>
          {props.children}
        </Suspense>
      </PageCardLayout>
    </>
  );
}
