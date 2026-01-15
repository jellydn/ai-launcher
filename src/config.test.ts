import { describe, expect, test } from "bun:test";
import { validateTemplate } from "./config";

describe("validateTemplate", () => {
	test("accepts valid template with $@ placeholder", () => {
		const template = {
			name: "review",
			command: "amp -p 'Review: $@'",
			description: "Code review",
		};

		const errors = validateTemplate(template, "templates[0]");
		expect(errors).toHaveLength(0);
	});

	test("accepts valid template without $@ placeholder", () => {
		const template = {
			name: "gemini",
			command: "ccs gemini 'Explain architecture'",
			description: "Architecture explanation",
		};

		const errors = validateTemplate(template, "templates[0]");
		expect(errors).toHaveLength(0);
	});

	test("rejects template with multiple $@ placeholders", () => {
		const template = {
			name: "double",
			command: "cmd $@ and $@",
			description: "Double placeholder",
		};

		const errors = validateTemplate(template, "templates[0]");
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]?.message).toContain("at most one $@ placeholder");
	});

	test("warns about $@ at start of command", () => {
		const template = {
			name: "bad",
			command: "$@ --flag",
			description: "Placeholder at start",
		};

		const errors = validateTemplate(template, "templates[0]");
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]?.message).toContain("starts with $@");
	});

	test("rejects template with unsafe characters", () => {
		const template = {
			name: "unsafe",
			command: "cmd $(rm -rf /)",
			description: "Unsafe command",
		};

		const errors = validateTemplate(template, "templates[0]");
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]?.message).toContain("unsafe characters");
	});

	test("requires name, command, and description", () => {
		const template = {
			name: "",
			command: "",
			description: "",
		};

		const errors = validateTemplate(template, "templates[0]");
		expect(errors.length).toBeGreaterThanOrEqual(3);
	});

	test("accepts optional aliases array", () => {
		const template = {
			name: "review",
			command: "amp -p 'Review: $@'",
			description: "Code review",
			aliases: ["rev", "code-review"],
		};

		const errors = validateTemplate(template, "templates[0]");
		expect(errors).toHaveLength(0);
	});

	test("rejects non-string aliases", () => {
		const template = {
			name: "review",
			command: "cmd",
			description: "Test",
			aliases: [123, "valid"] as unknown as string[],
		};

		const errors = validateTemplate(template, "templates[0]");
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]?.message).toContain("aliases");
	});
});
