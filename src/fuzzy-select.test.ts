import { describe, expect, test } from "bun:test";
import { promptForInput, toSelectableItems } from "./fuzzy-select";

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
		expect(firstItem?.aliases).toBeUndefined();
	});
});

describe("promptForInput", () => {
	test("is exported and callable", () => {
		// Basic check that function exists and is callable
		expect(typeof promptForInput).toBe("function");
		expect(promptForInput.length).toBe(1); // Takes 1 parameter
	});

	// Note: Full integration testing of promptForInput requires a TTY and user interaction
	// These tests are better suited for manual testing or E2E test suites
});
