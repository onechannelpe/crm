export function createTextEditorState(
  initialValue: string,
  onCommit: (value: string) => void,
) {
  let cancelled = false;
  let committed = false;

  return {
    cancel() {
      cancelled = true;
    },
    commit(value: string) {
      if (committed || cancelled) return;
      committed = true;

      const next = value.trim();
      if (next !== initialValue.trim()) onCommit(next);
    },
  };
}
