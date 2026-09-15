import { describe, expect, it } from "vitest";
import { shouldKeepComboboxFocusAfterCommit } from "./searchableSelectCommit";

describe("shouldKeepComboboxFocusAfterCommit", () => {
  it("keeps focus for normal options", () => {
    expect(shouldKeepComboboxFocusAfterCommit({ isAction: false })).toBe(true);
    expect(shouldKeepComboboxFocusAfterCommit({})).toBe(true);
    expect(shouldKeepComboboxFocusAfterCommit(null)).toBe(true);
    expect(shouldKeepComboboxFocusAfterCommit(undefined)).toBe(true);
  });

  it("drops focus for action options that open another dialog", () => {
    expect(shouldKeepComboboxFocusAfterCommit({ isAction: true })).toBe(false);
  });
});
