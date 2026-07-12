import { spawn } from "node:child_process";
import type { GenerateOptions, Provider, ProviderConfig } from "../provider.ts";
import { ProviderError } from "../provider.ts";

interface OpencodeConfig extends ProviderConfig {
  agent?: string;
  command?: string;
}

function getOpencodeCommand(config: OpencodeConfig): string {
  return config.command ?? "opencode";
}

function getOpencodeModel(config: OpencodeConfig): string {
  return config.model ?? process.env.AI_SUMMARY_MODEL ?? "opencode/big-pickle";
}

function getOpencodeAgent(config: OpencodeConfig): string {
  return config.agent ?? process.env.OPENCODE_AGENT ?? "plan";
}

export class OpencodeProvider implements Provider {
  readonly name = "opencode";
  private readonly command: string;
  private readonly model: string;
  private readonly agent: string;

  constructor(config: OpencodeConfig = {}) {
    this.command = getOpencodeCommand(config);
    this.model = getOpencodeModel(config);
    this.agent = getOpencodeAgent(config);
  }

  async *generate(options: GenerateOptions): AsyncGenerator<string> {
    const promptText = options.messages.map((m) => m.content).join("\n\n");
    const args = ["run", "--model", this.model, "--agent", this.agent];

    const child = spawn(this.command, args, { stdio: "pipe" });

    if (!child.stdin || !child.stdout || !child.stderr) {
      throw new ProviderError("Opencode failed to start: stdio not available");
    }

    let stderr = "";
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    const exitPromise = new Promise<void>((resolve, reject) => {
      let resolved = false;

      child.on("error", (error) => {
        if (!resolved) {
          resolved = true;
          reject(
            new ProviderError(
              `Opencode failed: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      });

      child.on("close", (code) => {
        if (!resolved) {
          resolved = true;
          if (code === 0) {
            resolve();
          } else {
            const errorDetails = stderr.trim() || "no stderr";
            reject(new ProviderError(`Opencode exited with code ${code}: ${errorDetails}`));
          }
        }
      });
    });

    child.stdin.end(promptText, "utf-8");

    try {
      for await (const chunk of child.stdout as AsyncIterable<Buffer>) {
        yield chunk.toString("utf-8");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Premature close") {
        await exitPromise;
        return;
      }
      throw error;
    }

    await exitPromise;
  }
}
