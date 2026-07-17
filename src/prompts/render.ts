import { ZodError } from "zod";
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
    render: (variables) => {
      try {
        return definition.render(definition.schema.parse(variables));
      } catch (error) {
        if (error instanceof ZodError) {
          const issues = error.issues
            .map((issue) => {
              const path = issue.path.length > 0 ? issue.path.join(".") : "input";
              return `${path}: ${issue.message}`;
            })
            .join(", ");
          throw new Error(`Validation failed for prompt "${definition.id}": ${issues}`);
        }
        throw error;
      }
    },
  };
}
