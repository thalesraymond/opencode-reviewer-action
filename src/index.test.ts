import { describe, expect, it } from "vitest";
import { add, formatGreeting } from "./index";

describe("dummy action helpers", () => {
  it("adds numbers correctly", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("formats a greeting message", () => {
    expect(formatGreeting("OpenCode")).toBe("Hello, OpenCode!");
  });
});
