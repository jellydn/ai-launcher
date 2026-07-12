import type { GenerateOptions, Provider } from "../provider.ts";

export const DEFAULT_MOCK_RESPONSE = JSON.stringify({
  title: "Mock Summary",
  summary: "This is a mock summary generated because AI_SUMMARY_PROVIDER is set to mock.",
  key_points: ["Mock key point one", "Mock key point two"],
  action_items: ["Mock action item one"],
  category: "article",
  importance: "low",
});

export class MockProvider implements Provider {
  readonly name = "mock";

  async *generate(_options: GenerateOptions): AsyncGenerator<string> {
    for (const chunk of DEFAULT_MOCK_RESPONSE.match(/.{1,20}/g) ?? []) {
      yield chunk;
    }
  }
}
