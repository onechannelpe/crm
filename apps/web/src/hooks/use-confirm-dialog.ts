import { createSignal } from "solid-js";

export interface ConfirmDialogControls {
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
}

export function useConfirmDialog(): ConfirmDialogControls {
  const [isOpen, setIsOpen] = createSignal(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
