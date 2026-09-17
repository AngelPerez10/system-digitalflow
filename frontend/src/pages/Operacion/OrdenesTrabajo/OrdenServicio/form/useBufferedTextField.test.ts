import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBufferedTextField } from "./useBufferedTextField";

describe("useBufferedTextField", () => {
  it("actualiza el valor local de inmediato y propaga al padre", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useBufferedTextField("", commit));

    act(() => {
      result.current.onFocus();
      result.current.onChange("hola");
    });

    expect(result.current.value).toBe("hola");
    expect(commit).toHaveBeenCalledWith("hola");
  });

  it("en blur hace flush del valor local", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useBufferedTextField("a", commit));

    act(() => {
      result.current.onFocus();
      result.current.onChange("ab");
      commit.mockClear();
      result.current.onBlur();
    });

    expect(commit).toHaveBeenCalledWith("ab");
  });

  it("no pisa el valor local con external mientras tiene foco", () => {
    const commit = vi.fn();
    const { result, rerender } = renderHook(
      ({ external }) => useBufferedTextField(external, commit),
      { initialProps: { external: "" } },
    );

    act(() => {
      result.current.onFocus();
      result.current.onChange("local");
    });

    rerender({ external: "desde-padre" });
    expect(result.current.value).toBe("local");
  });
});
