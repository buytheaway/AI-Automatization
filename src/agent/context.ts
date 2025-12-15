import { Observation } from "../browser/observe.js";

function trunc(s: string | undefined, n = 120) {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export function summarizeObservation(obs: Observation, maxElements = 30): string {
  const parts: string[] = [];
  parts.push(`url: ${obs.url}`);
  if (obs.title) parts.push(`title: ${trunc(obs.title, 120)}`);
  parts.push(`screenshot: ${obs.screenshot_path}`);

  const elems = obs.elements.slice(0, maxElements).map((e) => {
    const name = e.name || e.text || e.placeholder || "";
    const bbox = e.bbox ? `@${Math.round(e.bbox.x)},${Math.round(e.bbox.y)}` : "";
    return `${e.id}:${e.tag}${e.role ? `(${e.role})` : ""} ${trunc(name, 80)} ${bbox}`.trim();
  });

  parts.push(`elements_count: ${obs.elements.length}`);
  parts.push(`elements: ${elems.join(" | ")}`);

  return parts.join(" \n");
}

export function buildActorContext(opts: { task: string; plan: unknown; memory: string; obs: Observation }) {
  const { task, plan, memory, obs } = opts;
  return [
    `TASK: ${task}`,
    `PLAN: ${JSON.stringify(plan)}`,
    `MEMORY: ${trunc(memory, 2000) || "(empty)"}`,
    `OBSERVE_SUMMARY:\n${summarizeObservation(obs, 40)}`,
  ].join("\n\n");
}

export function buildCriticContext(opts: { task: string; plan: unknown; prevMemory: string; lastAction: string; actionResult: unknown; newObs: Observation }) {
  const { task, plan, prevMemory, lastAction, actionResult, newObs } = opts;
  return [
    `TASK: ${task}`,
    `PLAN: ${JSON.stringify(plan)}`,
    `PREV_MEMORY: ${trunc(prevMemory, 2000) || "(empty)"}`,
    `LAST_ACTION: ${lastAction}`,
    `ACTION_RESULT: ${JSON.stringify(actionResult)}`,
    `NEW_OBS_SUMMARY:\n${summarizeObservation(newObs, 30)}`,
  ].join("\n\n");
}
