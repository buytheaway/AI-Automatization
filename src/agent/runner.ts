import { AppConfig } from "../config.js";
import { BrowserController } from "../browser/controller.js";
import { buildTools, ToolHandlerContext } from "../tools/registry.js";
import { executeTool } from "../tools/handlers.js";
import { securityCheckOrAsk } from "../security/guard.js";
import { PROMPTS } from "./prompts.js";
import { summarizeObservation, buildActorContext, buildCriticContext } from "./context.js";
import { makeProvider } from "./providers/openai.js";
import { makeAnthropicProvider } from "./providers/anthropic.js";
import { toolCall, toolResult, warn } from "../utils/logger.js";

type RL = { question(prompt: string): Promise<string> };

type PlannerOut = { goal: string; strategy: string; checkpoints: string[] };
type CriticOut = { status: "continue" | "done" | "need_user"; note: string; memory_update: string };

export class AgentRunner {
  private provider: ReturnType<typeof makeProvider> | ReturnType<typeof makeAnthropicProvider>;
  private tools = buildTools();
  private memory = "";

  constructor(
    private cfg: AppConfig,
    private browser: BrowserController,
    private rl: RL,
  ) {
    this.provider = cfg.provider === "anthropic"
      ? makeAnthropicProvider(cfg)
      : makeProvider(cfg);
  }

  async run(task: string): Promise<string> {
    // 0) planner (без tools)
    const plan = await this.provider.textOnly<PlannerOut>({
      system: PROMPTS.planner,
      user: `Задача: ${task}\nКороткая память: ${this.memory}`.trim()
    });

    // 1) стартовое наблюдение
    const obs = await this.browser.observe();
    this.browser.setLastObservation(obs);

    let steps = 0;
    let lastFinalText = "";

    while (steps++ < this.cfg.maxSteps) {
      // 2) actor (с tools)
      const ctx: ToolHandlerContext = { cfg: this.cfg, browser: this.browser, rl: this.rl };

      const actorInput = buildActorContext({
        task,
        plan,
        memory: this.memory,
        obs: this.browser.getLastObservation(),
      });

      const actor = await this.provider.withTools({
        system: PROMPTS.actor,
        user: actorInput,
        tools: this.tools,
      });

      // финальный текст (если модель не зовёт tools)
      if (actor.type === "final") {
        lastFinalText = actor.text.trim();
        if (lastFinalText.startsWith("DONE:")) return lastFinalText;
        if (lastFinalText.startsWith("NEED_USER:")) return lastFinalText;

        // иначе — считаем как промежуточный ответ и продолжаем
        warn(`Model returned text without DONE/NEED_USER. Continuing…`);
      }

      // tool calls (в Responses API может быть несколько)
      // provider adapters may return different shapes; normalize safely
      type AnyCall = { name: string; args: any };
      const maybe = actor as unknown as { calls?: AnyCall[] };
      for (const call of maybe.calls ?? []) {
        toolCall(call.name, call.args);

        // security layer: спросим перед потенциально опасным действием
        const ok = await securityCheckOrAsk(call, this.browser.getLastObservation(), this.rl);
        if (!ok) return "NEED_USER: Отменено пользователем (security prompt).";

        const out = await executeTool(call, ctx);
        toolResult(call.name, out);

        // после любого действия — обновим observe (чтобы жить на динамике)
        const newObs = await this.browser.observe();
        this.browser.setLastObservation(newObs);

        // обновим краткую память через critic (без tools)
        const criticInput = buildCriticContext({
          task,
          plan,
          prevMemory: this.memory,
          lastAction: `${call.name} ${JSON.stringify(call.args)}`,
          actionResult: out,
          newObs,
        });

        const critic = await this.provider.textOnly<CriticOut>({
          system: PROMPTS.critic,
          user: criticInput,
        });

        this.memory = critic.memory_update?.slice(0, 2000) ?? this.memory;

        if (critic.status === "done") return `DONE: ${critic.note}`;
        if (critic.status === "need_user") return `NEED_USER: ${critic.note}`;
      }
    }

    return lastFinalText || "NEED_USER: Достигнут лимит шагов, уточни задачу или дай подсказку/URL.";
  }
}
