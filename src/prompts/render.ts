import type { PromptTemplate, PromptTemplateDefinition } from "./types.ts";

export function definePrompt<TVariables>(
  definition: PromptTemplateDefinition<TVariables>
): PromptTemplate<TVariables> {
  return {
    id: definition.id,
    version: definition.version,
    description: definition.description,
    variables: definition.variables,
    output: definition.output,
    render: (variables) => definition.render(definition.schema.parse(variables)),
  };
}
