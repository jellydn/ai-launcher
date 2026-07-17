import type { z } from "zod";

export interface PromptMessages {
  system: string;
  user: string;
}

export interface PromptVariable {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface PromptTemplate<TVariables> {
  id: string;
  version: string;
  description: string;
  variables: readonly PromptVariable[];
  output: readonly string[];
  render: (variables: TVariables) => PromptMessages;
}

export interface PromptTemplateDefinition<TVariables>
  extends Omit<PromptTemplate<TVariables>, "render"> {
  schema: z.ZodType<TVariables>;
  render: (variables: TVariables) => PromptMessages;
}
