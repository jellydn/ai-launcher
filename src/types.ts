export type AuthType = "oauth" | "api_key" | "none";

export interface Tool {
  name: string;
  command: string;
  description?: string;
  aliases?: string[];
  authType?: AuthType;
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
