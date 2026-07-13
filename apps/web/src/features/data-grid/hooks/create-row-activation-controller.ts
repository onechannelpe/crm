import { createSignal, type Accessor } from "solid-js";

export type DataGridRowActivationController = {
  suppressed: Accessor<boolean>;
  suppress: () => void;
  clearSuppression: () => void;
};

export function createDataGridRowActivationController(): DataGridRowActivationController {
  const [suppressed, setSuppressed] = createSignal(false);

  return {
    suppressed,
    suppress: () => setSuppressed(true),
    clearSuppression: () => setSuppressed(false),
  };
}
