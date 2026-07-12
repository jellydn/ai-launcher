# ai-meeting

A tiny CLI that extracts summaries, action items, and risks from meeting notes or transcripts using the OpenAI API with streaming, structured outputs, and Zod.

## Stack

- [Bun](https://bun.sh/) — runtime and package manager
- [OpenAI SDK](https://github.com/openai/openai-node)
- [Zod](https://zod.dev/) — schema validation and type inference
- TypeScript

## Project layout

```
src/meeting/
  index.ts    # CLI entrypoint
  schema.ts   # Zod schemas for the structured output
  prompt.ts   # Prompt builder
  summarize.ts# OpenAI streaming + structured output logic
README.md
```

## Setup

```bash
bun install
```

Set your API key for OpenAI or OpenRouter:

```bash
export OPENAI_API_KEY="sk-..."
# or
export OPENROUTER_API_KEY="sk-or-..."
```

## Usage

```bash
# From a file
bun run src/meeting/index.ts meeting.md

# From stdin
cat meeting.md | bun run src/meeting/index.ts

# JSON only
cat meeting.md | bun run src/meeting/index.ts --json

# Show the raw JSON stream as it arrives
cat meeting.md | bun run src/meeting/index.ts --progress

# Tune the model and temperature
bun run src/meeting/index.ts meeting.md --model gpt-4o-mini-2024-07-18 --temperature 0.0

# Use OpenRouter for free/cost-effective dev and test
bun run src/meeting/index.ts meeting.md --openrouter
OPENROUTER_API_KEY=... bun run src/meeting/index.ts meeting.md --openrouter --model openai/gpt-4o
bun run src/meeting/index.ts meeting.md --base-url https://openrouter.ai/api/v1 --model google/gemini-2.0-flash-exp:free
```

After running `bun run build`, the compiled `ai-meeting` binary is available at `dist/ai-meeting`.

## Example output

```json
{
  "summary": "BACX migration is on track. The team agreed to move Better Auth to the VPS before the next release.",
  "action_items": [
    { "owner": "Dung", "task": "Move Better Auth to VPS", "due": "Next week" }
  ],
  "risks": ["AWS migration delay"]
}
```

## Notes

- **Structured Outputs are much more reliable than parsing free-form text with regex or string manipulation.**
  By describing the exact JSON schema with Zod and passing it to `response_format`, the model is constrained to produce valid, predictable output.

- **Streaming greatly improves perceived responsiveness, even when total completion time stays similar.**
  The tool calls `client.chat.completions.stream()` and forwards `delta.content` chunks in real time, so the user gets immediate feedback instead of a blank wait.

- **Prompt quality has a larger impact on output consistency than changing temperature for deterministic extraction tasks.**
  A clear system instruction, explicit output schema, and a labeled transcript delimiter produce more consistent results than small temperature tweaks.

## Week 1 recap

- **Day 1:** Call an LLM through an API.
- **Day 2:** Write effective prompts with clear instructions and constraints.
- **Day 3:** Understand how temperature and sampling affect output quality.
- **Day 4:** Produce machine-readable JSON using schemas.
- **Day 5:** Stream tokens for a better user experience.
- **Day 6:** Learn how tool/function-calling works (this mini-CLI uses structured `response_format` rather than `tool_choice`).
- **Day 7:** Combine everything into a small, usable application.

This project ties the API, prompting, structured outputs, streaming, and temperature choices into one tool that can be run with `bun run src/meeting/index.ts <meeting.md>`, `ai meeting <meeting.md>`, or `ai-meeting <meeting.md>` after building.
