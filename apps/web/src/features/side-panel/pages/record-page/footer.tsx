import BrowserMaximize from "~/components/icons/browser-maximize";
import {
  FooterButtonPrimary,
  FooterButtonSecondary,
  FooterDots,
  FooterIcon,
  FooterLabel,
  FooterShortcut,
  PanelFooter,
} from "~/features/side-panel/components/panel-footer";

type FooterProps = {
  onOpen: () => void;
};

export function Footer(props: FooterProps) {
  return (
    <PanelFooter>
      <FooterButtonSecondary>
        <FooterLabel>Opciones</FooterLabel>
        <FooterDots />
        <FooterShortcut>Ctrl O</FooterShortcut>
      </FooterButtonSecondary>
      <FooterButtonPrimary onClick={props.onOpen}>
        <FooterIcon>
          <BrowserMaximize size={14} />
        </FooterIcon>
        <FooterLabel>Open</FooterLabel>
        <FooterShortcut>Ctrl ⏎</FooterShortcut>
      </FooterButtonPrimary>
    </PanelFooter>
  );
}
