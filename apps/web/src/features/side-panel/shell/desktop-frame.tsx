import type { JSX } from "solid-js";

import { ResizeGap } from "./resize-gap";
import { PanelShell } from "./shell";
import { WidthEffect } from "./width-effect";

import styles from "./desktop-frame.module.css";

type DesktopSidePanelFrameProps = {
  isInteractive: boolean;
  renderContent?: () => JSX.Element;
  shouldRenderChildren: boolean;
};

export function DesktopSidePanelFrame(props: DesktopSidePanelFrameProps) {
  return (
    <div class={styles.root}>
      <WidthEffect />
      <ResizeGap isInteractive={props.isInteractive} />
      <PanelShell
        isInteractive={props.isInteractive}
        renderContent={props.renderContent}
        shouldRenderChildren={props.shouldRenderChildren}
      />
    </div>
  );
}
