import { describe, expect, it, vi } from "vitest";

import { createTextEditorState } from "~/features/data-grid/components/editors/text-editor-state";

describe("createTextEditorState", () => {
  it("commits one changed trimmed value", () => {
    const onCommit = vi.fn<(value: string) => void>();
    const state = createTextEditorState("before", onCommit);

    state.commit("  after  ");
    state.commit("ignored");

    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith("after");
  });

  it("does not commit an unchanged value", () => {
    const onCommit = vi.fn<(value: string) => void>();
    const state = createTextEditorState(" value ", onCommit);

    state.commit("value");

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not commit after cancellation", () => {
    const onCommit = vi.fn<(value: string) => void>();
    const state = createTextEditorState("before", onCommit);

    state.cancel();
    state.commit("after");

    expect(onCommit).not.toHaveBeenCalled();
  });
});
