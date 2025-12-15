import { ToolCall } from "../tools/registry.js";
import { Observation } from "../browser/observe.js";

const DANGEROUS_RE = /(оплат|pay|checkout|купить|purchase|заказ|order|confirm|подтверд|удал|delete|remove|отправ|send|submit)/i;

export async function securityCheckOrAsk(
  call: ToolCall,
  obs: Observation,
  rl: { question(prompt: string): Promise<string> }
): Promise<boolean> {
  if (call.name !== "browser_click" && call.name !== "browser_type") return true;

  const elementId = String(call.args.element_id ?? "");
  const el = obs.elements.find(e => e.id === elementId);
  const hint = `${el?.tag ?? ""} ${el?.role ?? ""} ${el?.name ?? ""} ${el?.text ?? ""}`.trim();

  const looksDangerous =
    DANGEROUS_RE.test(hint) ||
    (call.name === "browser_type" && (el?.type === "password"));

  if (!looksDangerous) return true;

  const ans = (await rl.question(`🔐 Security check: выполнить "${call.name}" по "${hint}"? (y/n): `)).trim().toLowerCase();
  return ans === "y" || ans === "yes";
}
