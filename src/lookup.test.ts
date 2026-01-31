import { describe, expect, test } from "bun:test";
import { findToolByName } from "./lookup";
import type { SelectableItem } from "./types";

const MOCK_ITEMS: SelectableItem[] = [
  {
    name: "claude",
    command: "claude",
    description: "Anthropic Claude",
    isTemplate: false,
    aliases: ["c"],
  },
  {
    name: "ccs:glm",
    command: "ccs glm",
    description: "GLM via CCS",
    isTemplate: false,
    aliases: [],
  },
  {
    name: "ccs:mm",
    command: "ccs mm",
    description: "MiniMax via CCS",
    isTemplate: false,
    aliases: [],
  },
  {
    name: "ccs:gemini",
    command: "ccs gemini",
    description: "Gemini via CCS",
    isTemplate: false,
    aliases: [],
  },
  {
    name: "commit-zen",
    command: "opencode run 'commit message'",
    description: "Zen commit",
    isTemplate: true,
    aliases: ["commit", "commit-message"],
  },
  {
    name: "commit-atomic",
    command: "opencode run 'atomic commit'",
    description: "Atomic commit",
    isTemplate: true,
    aliases: ["ac", "auto-commit"],
  },
  {
    name: "review",
    command: "amp review",
    description: "Code review",
    isTemplate: true,
    aliases: ["rev"],
  },
];

describe("findToolByName", () => {
  describe("exact name matching", () => {
    test("finds tool by exact name", () => {
      const result = findToolByName("claude", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("claude");
    });

    test("finds tool by exact name case-insensitive", () => {
      const result = findToolByName("CLAUDE", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("claude");
    });

    test("returns error for non-existent tool", () => {
      const result = findToolByName("nonexistent", MOCK_ITEMS);

      expect(result.success).toBe(false);
      expect(result.error).toContain("nonexistent");
    });
  });

  describe("alias matching", () => {
    test("finds tool by alias", () => {
      const result = findToolByName("c", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("claude");
    });

    test("finds tool by alias case-insensitive", () => {
      const result = findToolByName("C", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("claude");
    });

    test("finds template by alias", () => {
      const result = findToolByName("rev", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("review");
    });

    test("finds template by multi-word alias", () => {
      const result = findToolByName("commit-message", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("commit-zen");
    });
  });

  describe("suffix matching", () => {
    test("matches suffix with colon separator", () => {
      const result = findToolByName("mm", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("ccs:mm");
    });

    test("matches suffix with colon separator case-insensitive", () => {
      const result = findToolByName("MM", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("ccs:mm");
    });

    test("matches glm suffix", () => {
      const result = findToolByName("glm", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("ccs:glm");
    });

    test("prefers suffix match over fuzzy match", () => {
      const result = findToolByName("gemini", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("ccs:gemini");
    });
  });

  describe("substring matching", () => {
    test("matches when only one substring match exists", () => {
      const items: SelectableItem[] = [
        {
          name: "unique-tool",
          command: "unique",
          description: "Unique",
          isTemplate: false,
          aliases: [],
        },
        { name: "other", command: "other", description: "Other", isTemplate: false, aliases: [] },
      ];

      const result = findToolByName("unique", items);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("unique-tool");
    });

    test("does not use substring match when multiple matches exist", () => {
      const items: SelectableItem[] = [
        { name: "foo-bar", command: "foo", description: "Foo", isTemplate: false, aliases: [] },
        { name: "foo-baz", command: "bar", description: "Bar", isTemplate: false, aliases: [] },
      ];

      const result = findToolByName("foo", items);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ambiguous match");
    });
  });

  describe("fuzzy matching", () => {
    test("finds tool with slight misspelling", () => {
      const result = findToolByName("cluade", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("claude");
    });

    test("finds template by partial name", () => {
      const result = findToolByName("commit", MOCK_ITEMS);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("commit-zen");
    });
  });

  describe("ambiguous match detection", () => {
    test("returns ambiguous error for multiple close matches", () => {
      const items: SelectableItem[] = [
        {
          name: "opencode",
          command: "opencode",
          description: "OpenCode",
          isTemplate: false,
          aliases: [],
        },
        {
          name: "opencode-test",
          command: "opencode test",
          description: "OpenCode test",
          isTemplate: false,
          aliases: [],
        },
      ];

      const result = findToolByName("open", items);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ambiguous match");
      expect(result.candidates).toBeDefined();
      expect(result.candidates?.length).toBeGreaterThan(1);
    });

    test("includes all ambiguous candidates in error", () => {
      const items: SelectableItem[] = [
        {
          name: "opencode",
          command: "opencode",
          description: "OpenCode",
          isTemplate: false,
          aliases: [],
        },
        {
          name: "opencode-test",
          command: "opencode test",
          description: "OpenCode test",
          isTemplate: false,
          aliases: [],
        },
      ];

      const result = findToolByName("open", items);

      expect(result.success).toBe(false);
      expect(result.candidates).toBeDefined();
      expect(result.candidates?.length).toBeGreaterThan(1);
      const opencodeCandidate = result.candidates?.find((c) => c.name === "opencode");
      expect(opencodeCandidate).toBeDefined();
    });

    test("does not trigger ambiguity when best match is very good", () => {
      const items: SelectableItem[] = [
        {
          name: "very-specific-name",
          command: "cmd",
          description: "Specific",
          isTemplate: false,
          aliases: [],
        },
        {
          name: "different-tool",
          command: "cmd2",
          description: "Different",
          isTemplate: false,
          aliases: [],
        },
      ];

      const result = findToolByName("specific", items);

      expect(result.success).toBe(true);
      expect(result.item?.name).toBe("very-specific-name");
    });
  });
});
