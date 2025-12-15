import OpenAI from "openai";
import { AppConfig } from "../../config.js";

type ToolDef = { type: "function"; name: string; description?: string; parameters: unknown };

type ToolCall = { name: string; args: any; call_id: string };
type WithToolsResult =
  | { type: "final"; text: string }
  | { type: "tool_calls"; calls: Array<{ name: string; args: any }> };

export function makeProvider(cfg: AppConfig) {
  if (!cfg.openaiApiKey) throw new Error("OPENAI_API_KEY is missing");
  const client = new OpenAI({ apiKey: cfg.openaiApiKey });

  async function textOnly<T>({ system, user }: { system: string; user: string }): Promise<T> {
    const r = await client.responses.create({
      model: cfg.openaiModel,
      instructions: system,
      input: [{ role: "user", content: user }],
      max_output_tokens: 800,
    });
    const txt = r.output_text ?? "";
    try { return JSON.parse(txt) as T; } catch { return { } as T; }
  }

  async function withTools({ system, user, tools }: { system: string; user: string; tools: ToolDef[] }): Promise<WithToolsResult> {
    // input_list, как в гайде: мы добавляем output и tool outputs обратно :contentReference[oaicite:2]{index=2}
    const input: any[] = [{ role: "user", content: user }];

    const r = await client.responses.create({
      model: cfg.openaiModel,
      instructions: system,
      input,
      tools,
      parallel_tool_calls: false,
      max_output_tokens: 900,
    });

    const calls: Array<{ name: string; args: any }> = [];
    for (const item of (r.output ?? [])) {
      if (item.type === "function_call") {
        let args: any = {};
        try { args = JSON.parse(item.arguments ?? "{}"); } catch {}
        calls.push({ name: item.name, args });
      }
    }

    if (calls.length > 0) return { type: "tool_calls", calls };
    return { type: "final", text: (r.output_text ?? "").trim() };
  }

  return { textOnly, withTools };
}
