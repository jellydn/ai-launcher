import { describe, expect, test } from "bun:test";
import { promptForInput, toSelectableItems } from "./fuzzy-select";
import type { Template } from "./types";

describe("toSelectableItems", () => {
  test("converts tools and templates to selectable items", () => {
    const tools = [
      {
        name: "claude",
        command: "claude",
        description: "Anthropic Claude CLI",
      },
    ];
    const templates = [
      {
        name: "review",
        command: "amp -p 'Review: $@'",
        description: "Code review",
      },
    ];

    const items = toSelectableItems(tools, templates);

    expect(items).toHaveLength(2);
    expect(items[0]?.isTemplate).toBe(false);
    expect(items[1]?.isTemplate).toBe(true);
  });

  test("preserves tool properties", () => {
    const tools = [
      {
        name: "claude",
        command: "claude",
        description: "Anthropic Claude CLI",
        aliases: ["c"],
      },
    ];
    const templates = [
      {
        name: "test",
        command: "test",
        description: "Test template",
      },
    ];

    const items = toSelectableItems(tools, templates);

    expect(items[0]?.name).toBe("claude");
    expect(items[0]?.command).toBe("claude");
    expect(items[0]?.description).toBe("Anthropic Claude CLI");
    expect(items[0]?.aliases).toEqual(["c"]);
  });

  test("handles tools without optional fields", () => {
    const tools = [{ name: "tool", command: "tool" }];
    const templates = [
      {
        name: "template",
        command: "cmd",
        description: "desc",
      },
    ];

    const items = toSelectableItems(tools, templates);

    const firstItem = items[0];
    expect(firstItem?.description).toBe("");
    expect(firstItem?.aliases).toEqual([]);
  });

  test("normalizes undefined aliases to empty array", () => {
    const tools = [
      { name: "no-alias-tool", command: "cmd" },
      { name: "with-alias-tool", command: "cmd2", aliases: ["alias1", "alias2"] },
    ];
    const templates: Template[] = [];

    const items = toSelectableItems(tools, templates);

    expect(items[0]?.aliases).toEqual([]);
    expect(items[1]?.aliases).toEqual(["alias1", "alias2"]);
  });
});

describe("promptForInput", () => {
  test("is exported and callable", () => {
    expect(typeof promptForInput).toBe("function");
    expect(promptForInput.length).toBe(1);
  });
});
