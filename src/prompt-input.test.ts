import { describe, expect, test } from "bun:test";
import { promptForInput } from "./prompt-input";

describe("promptForInput", () => {
  test("is exported and callable", () => {
    expect(typeof promptForInput).toBe("function");
    expect(promptForInput.length).toBe(1);
  });
});
