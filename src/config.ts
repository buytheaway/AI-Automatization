export type ProviderName = "openai" | "anthropic";

export type AppConfig = {
  provider: ProviderName;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openaiModel: string;
  anthropicModel: string;
  headless: boolean;
  profileDir: string;
  screenshotDir: string;
  maxSteps: number;
  observeMaxElements: number;
};

function envBool(v: string | undefined, def: boolean) {
  if (v == null) return def;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function envInt(v: string | undefined, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function loadConfig(): AppConfig {
  const provider = (process.env.PROVIDER ?? "openai") as ProviderName;

  return {
    provider,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-5",
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
    headless: envBool(process.env.HEADLESS, false),
    profileDir: process.env.PROFILE_DIR ?? ".profile/chromium",
    screenshotDir: process.env.SCREENSHOT_DIR ?? ".artifacts/screens",
    maxSteps: envInt(process.env.MAX_STEPS, 60),
    observeMaxElements: envInt(process.env.OBSERVE_MAX_ELEMENTS, 80),
  };
}
