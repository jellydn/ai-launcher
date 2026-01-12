export interface Tool {
  name: string;
  command: string;
  description?: string;
  aliases?: string[];
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
