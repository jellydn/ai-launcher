export type AuthType = "oauth" | "api_key" | "none";

export interface Tool {
  name: string;
  command: string;
  description?: string;
  aliases?: string[];
  authType?: AuthType;
  promptCommand?: string;
  promptUseStdin?: boolean;
}

export interface Template {
  name: string;
  command: string;
  description: string;
  aliases?: string[];
}

export interface Config {
  tools: Tool[];
  templates: Template[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
}

export interface SelectableItem {
  name: string;
  command: string;
  description: string;
  isTemplate: boolean;
  aliases: string[];
  promptCommand?: string;
  promptUseStdin?: boolean;
}
