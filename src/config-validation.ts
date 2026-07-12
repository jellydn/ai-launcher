import { isSafeCommand } from "./template";
import type { ConfigValidationError } from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateTool(tool: unknown, index: number): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  const path = `tools[${index}]`;

  if (!isObjectRecord(tool)) {
    errors.push({ path, message: "Tool configuration must be an object" });
    return errors;
  }

  const toolObj = tool;

  const hasValidName = typeof toolObj.name === "string" && toolObj.name.trim() !== "";
  if (!hasValidName) {
    errors.push({
      path: `${path}.name`,
      message: "Tool name is required and must be a non-empty string",
    });
  }

  if (typeof toolObj.command !== "string" || toolObj.command.trim() === "") {
    errors.push({
      path: `${path}.command`,
      message: "Tool command is required and must be a non-empty string",
    });
  } else {
    const safeCommandPattern = /^[a-zA-Z0-9._\s-]+$/;
    const isSafe = safeCommandPattern.test(toolObj.command.trim());
    if (!isSafe) {
      errors.push({
        path: `${path}.command`,
        message: "Tool command contains unsafe characters",
      });
    }
  }

  const hasInvalidDescription =
    toolObj.description !== undefined && typeof toolObj.description !== "string";
  if (hasInvalidDescription) {
    errors.push({
      path: `${path}.description`,
      message: "Tool description must be a string",
    });
  }

  errors.push(...validateAliases(toolObj.aliases, `${path}.aliases`));

  return errors;
}

function validateAliases(aliases: unknown, path: string): ConfigValidationError[] {
  if (aliases === undefined) {
    return [];
  }

  if (!Array.isArray(aliases)) {
    return [{ path, message: "Aliases must be an array of strings" }];
  }

  const allStrings = aliases.every((a) => typeof a === "string");
  if (!allStrings) {
    return [{ path, message: "All aliases must be strings" }];
  }

  return [];
}

export function validateTemplate(template: unknown, path: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!isObjectRecord(template)) {
    errors.push({ path, message: "Template configuration must be an object" });
    return errors;
  }

  const templateObj = template;

  if (typeof templateObj.name !== "string" || templateObj.name.trim() === "") {
    errors.push({
      path: `${path}.name`,
      message: "Template name is required and must be a non-empty string",
    });
  }

  if (typeof templateObj.command !== "string" || templateObj.command.trim() === "") {
    errors.push({
      path: `${path}.command`,
      message: "Template command is required and must be a non-empty string",
    });
  } else if (!isSafeCommand(templateObj.command)) {
    errors.push({
      path: `${path}.command`,
      message: "Template command contains unsafe characters or patterns",
    });
  } else {
    const placeholderCount = (templateObj.command.match(/\$@/g) || []).length;
    if (placeholderCount > 1) {
      errors.push({
        path: `${path}.command`,
        message:
          "Template command should contain at most one $@ placeholder. Multiple placeholders are not supported.",
      });
    }

    if (placeholderCount === 1 && templateObj.command.trim().startsWith("$@")) {
      errors.push({
        path: `${path}.command`,
        message:
          "Template command starts with $@. Consider placing the placeholder after the base command for clarity.",
      });
    }
  }

  if (typeof templateObj.description !== "string" || templateObj.description.trim() === "") {
    errors.push({
      path: `${path}.description`,
      message: "Template description is required and must be a non-empty string",
    });
  }

  errors.push(...validateAliases(templateObj.aliases, `${path}.aliases`));

  if (
    templateObj.mode !== undefined &&
    templateObj.mode !== "read-only" &&
    templateObj.mode !== "write"
  ) {
    errors.push({
      path: `${path}.mode`,
      message: "Template mode must be 'read-only' or 'write'",
    });
  }

  if (templateObj.mode === "write" && templateObj.requiresConfirmation === false) {
    errors.push({
      path: `${path}.requiresConfirmation`,
      message: "Write templates must require confirmation",
    });
  }

  if (
    templateObj.requiresConfirmation !== undefined &&
    typeof templateObj.requiresConfirmation !== "boolean"
  ) {
    errors.push({
      path: `${path}.requiresConfirmation`,
      message: "Template requiresConfirmation must be a boolean",
    });
  }

  return errors;
}

export function validateRouter(router: unknown, path: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!isObjectRecord(router)) {
    errors.push({ path, message: "Router configuration must be an object" });
    return errors;
  }

  const routerObj = router;

  if (typeof routerObj.command !== "string" || routerObj.command.trim() === "") {
    errors.push({
      path: `${path}.command`,
      message: "Router command is required and must be a non-empty string",
    });
  } else if (!isSafeCommand(routerObj.command)) {
    errors.push({
      path: `${path}.command`,
      message: "Router command contains unsafe characters or patterns",
    });
  }

  if (routerObj.description !== undefined && typeof routerObj.description !== "string") {
    errors.push({
      path: `${path}.description`,
      message: "Router description must be a string",
    });
  }

  if (routerObj.promptUseStdin !== undefined && typeof routerObj.promptUseStdin !== "boolean") {
    errors.push({
      path: `${path}.promptUseStdin`,
      message: "Router promptUseStdin must be a boolean",
    });
  }

  return errors;
}

export function validateConfig(config: unknown): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!isObjectRecord(config)) {
    return [{ path: "config", message: "Config must be an object" }];
  }

  const configObj = config;

  if (!Array.isArray(configObj.tools)) {
    errors.push({ path: "tools", message: "Config must have a 'tools' array" });
  } else {
    for (let i = 0; i < configObj.tools.length; i++) {
      errors.push(...validateTool(configObj.tools[i], i));
    }
  }

  if (!Array.isArray(configObj.templates)) {
    errors.push({
      path: "templates",
      message: "Config must have a 'templates' array",
    });
  } else {
    for (let i = 0; i < configObj.templates.length; i++) {
      errors.push(...validateTemplate(configObj.templates[i], `templates[${i}]`));
    }
  }

  if (configObj.router !== undefined) {
    errors.push(...validateRouter(configObj.router, "router"));
  }

  return errors;
}

export function formatValidationErrors(errors: ConfigValidationError[]): string {
  const lines = ["Config validation failed:", ""];
  for (const error of errors) {
    const location = error.path ? `  ${error.path}: ` : "  ";
    lines.push(`${location}${error.message}`);
  }
  return lines.join("\n");
}
