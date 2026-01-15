import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config, ConfigValidationError } from "./types";

const CONFIG_DIR = join(homedir(), ".config", "ai-switcher");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: Config = {
	tools: [],
	templates: [],
};

function validateTool(tool: unknown, index: number): ConfigValidationError[] {
	const errors: ConfigValidationError[] = [];
	const path = `tools[${index}]`;

	if (typeof tool !== "object" || tool === null) {
		errors.push({ path, message: "Tool must be an object" });
		return errors;
	}

	const t = tool as Record<string, unknown>;

	if (typeof t.name !== "string" || t.name.trim() === "") {
		errors.push({
			path: `${path}.name`,
			message: "Tool name is required and must be a non-empty string",
		});
	}

	if (typeof t.command !== "string" || t.command.trim() === "") {
		errors.push({
			path: `${path}.command`,
			message: "Tool command is required and must be a non-empty string",
		});
	} else {
		const safeCommandPattern = /^[a-zA-Z0-9._\s-]+$/;
		if (!safeCommandPattern.test(t.command.trim())) {
			errors.push({
				path: `${path}.command`,
				message: "Tool command contains unsafe characters",
			});
		}
	}

	if (t.description !== undefined && typeof t.description !== "string") {
		errors.push({
			path: `${path}.description`,
			message: "Tool description must be a string",
		});
	}

	if (t.aliases !== undefined) {
		if (!Array.isArray(t.aliases)) {
			errors.push({
				path: `${path}.aliases`,
				message: "Tool aliases must be an array of strings",
			});
		} else if (!t.aliases.every((a) => typeof a === "string")) {
			errors.push({
				path: `${path}.aliases`,
				message: "All aliases must be strings",
			});
		}
	}

	return errors;
}

export function validateTemplate(
	template: unknown,
	path: string,
): ConfigValidationError[] {
	const errors: ConfigValidationError[] = [];

	if (typeof template !== "object" || template === null) {
		errors.push({ path, message: "Template must be an object" });
		return errors;
	}

	const t = template as Record<string, unknown>;

	if (typeof t.name !== "string" || t.name.trim() === "") {
		errors.push({
			path: `${path}.name`,
			message: "Template name is required and must be a non-empty string",
		});
	}

	if (typeof t.command !== "string" || t.command.trim() === "") {
		errors.push({
			path: `${path}.command`,
			message: "Template command is required and must be a non-empty string",
		});
	} else {
		const safeTemplatePattern = /^[a-zA-Z0-9._\s\-"':,!?/\\|$@]+$/;
		if (!safeTemplatePattern.test(t.command.trim())) {
			errors.push({
				path: `${path}.command`,
				message: "Template command contains unsafe characters",
			});
		}

		const placeholderCount = (t.command.match(/\$@/g) || []).length;
		if (placeholderCount > 1) {
			errors.push({
				path: `${path}.command`,
				message:
					"Template command should contain at most one $@ placeholder. Multiple placeholders are not supported.",
			});
		}

		if (placeholderCount === 1 && t.command.trim().startsWith("$@")) {
			errors.push({
				path: `${path}.command`,
				message:
					"Template command starts with $@. Consider placing the placeholder after the base command for clarity.",
			});
		}
	}

	if (typeof t.description !== "string" || t.description.trim() === "") {
		errors.push({
			path: `${path}.description`,
			message:
				"Template description is required and must be a non-empty string",
		});
	}

	if (t.aliases !== undefined) {
		if (!Array.isArray(t.aliases)) {
			errors.push({
				path: `${path}.aliases`,
				message: "Template aliases must be an array of strings",
			});
		} else if (!t.aliases.every((a) => typeof a === "string")) {
			errors.push({
				path: `${path}.aliases`,
				message: "All aliases must be strings",
			});
		}
	}

	return errors;
}

export function validateConfig(config: unknown): ConfigValidationError[] {
	const errors: ConfigValidationError[] = [];

	if (typeof config !== "object" || config === null) {
		errors.push({ path: "", message: "Config must be an object" });
		return errors;
	}

	const c = config as Record<string, unknown>;

	if (!Array.isArray(c.tools)) {
		errors.push({ path: "tools", message: "Config must have a 'tools' array" });
	} else {
		for (let i = 0; i < c.tools.length; i++) {
			errors.push(...validateTool(c.tools[i], i));
		}
	}

	if (!Array.isArray(c.templates)) {
		errors.push({
			path: "templates",
			message: "Config must have a 'templates' array",
		});
	} else {
		for (let i = 0; i < c.templates.length; i++) {
			errors.push(...validateTemplate(c.templates[i], `templates[${i}]`));
		}
	}

	return errors;
}

export function formatValidationErrors(
	errors: ConfigValidationError[],
): string {
	const lines = ["Config validation failed:", ""];
	for (const error of errors) {
		const location = error.path ? `  ${error.path}: ` : "  ";
		lines.push(`${location}${error.message}`);
	}
	lines.push("");
	lines.push(`Config file: ${CONFIG_PATH}`);
	return lines.join("\n");
}

function ensureConfigDir(): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true });
	}
}

function createDefaultConfig(): void {
	ensureConfigDir();
	writeFileSync(CONFIG_PATH, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
}

export function loadConfig(): Config {
	if (!existsSync(CONFIG_PATH)) {
		createDefaultConfig();
		return { ...DEFAULT_CONFIG };
	}

	let rawContent: string;
	try {
		rawContent = readFileSync(CONFIG_PATH, "utf-8");
	} catch (err) {
		throw new Error(`Failed to read config file: ${CONFIG_PATH}\n${err}`);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(rawContent);
	} catch (err) {
		throw new Error(
			`Config file contains invalid JSON: ${CONFIG_PATH}\n${err}`,
		);
	}

	const errors = validateConfig(parsed);
	if (errors.length > 0) {
		throw new Error(formatValidationErrors(errors));
	}

	return parsed as Config;
}

export function getConfigPath(): string {
	return CONFIG_PATH;
}
