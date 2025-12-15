import Anthropic from "@anthropic-ai/sdk";
import { AppConfig } from "../../config.js";

type ToolDef = { type: "function"; name: string; description?: string; parameters: unknown };
type ToolCall = { name: string; args: any };
type WithToolsResult =
  | { type: "final"; text: string }
  | { type: "tool_calls"; calls: ToolCall[] };

export function makeAnthropicProvider(cfg: AppConfig) {
  if (!cfg.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is missing");
  const client = new Anthropic({ apiKey: cfg.anthropicApiKey });

  async function textOnly<T>({ system, user }: { system: string; user: string }): Promise<T> {
    const r = await client.messages.create({
      model: cfg.anthropicModel,
      max_tokens: 900,
      system,
      messages: [{ role: "user", content: user }],
    });

    const text = r.content?.map((b: any) => (b.type === "text" ? b.text : "")).join("") ?? "";
    try { return JSON.parse(text) as T; } catch { return {} as T; }
  }

  async function withTools({ system, user, tools }: { system: string; user: string; tools: ToolDef[] }): Promise<WithToolsResult> {
    // Claude 3.5 tool_use: explicitly pass tools + tool_choice:any
    const r = await client.messages.create({
      model: cfg.anthropicModel,
      system,
      max_tokens: 900,
      tool_choice: { type: "any" },
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as any,
      })),
      messages: [{ role: "user", content: user }],
    });

    const calls: ToolCall[] = [];
    const texts: string[] = [];

    for (const block of r.content ?? []) {
      if (block.type === "tool_use") {
        calls.push({ name: block.name, args: block.input ?? {} });
        continue;
      }
      if (block.type === "text") texts.push(block.text ?? "");
    }

    if (calls.length > 0) return { type: "tool_calls", calls };
    return { type: "final", text: texts.join("\n").trim() };
  }

  return { textOnly, withTools };
}
