import { z } from "zod";
import { AppConfig } from "../config.js";
import { BrowserController } from "../browser/controller.js";

export type ToolHandlerContext = {
  cfg: AppConfig;
  browser: BrowserController;
  rl: { question(prompt: string): Promise<string> };
};

export type ToolCall = { name: string; args: any };

export function buildTools() {
  // OpenAI function tools are JSON-schema based :contentReference[oaicite:4]{index=4}
  return [
    {
      type: "function" as const,
      name: "browser_goto",
      description: "Перейти по URL в текущей вкладке",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
    {
      type: "function" as const,
      name: "browser_observe",
      description: "Сделать компактный снимок страницы (url/title/скрин + список интерактивных элементов)",
      parameters: { type: "object", properties: {}, required: [] },
    },
    {
      type: "function" as const,
      name: "browser_click",
      description: "Кликнуть по element_id из последнего observe",
      parameters: {
        type: "object",
        properties: { element_id: { type: "string" } },
        required: ["element_id"],
      },
    },
    {
      type: "function" as const,
      name: "browser_type",
      description: "Ввести текст в поле element_id (по умолчанию очищает поле)",
      parameters: {
        type: "object",
        properties: {
          element_id: { type: "string" },
          text: { type: "string" },
          clear_first: { type: "boolean" },
        },
        required: ["element_id", "text"],
      },
    },
    {
      type: "function" as const,
      name: "browser_press",
      description: "Нажать клавишу (например Enter, Escape, Tab)",
      parameters: {
        type: "object",
        properties: { key: { type: "string" } },
        required: ["key"],
      },
    },
    {
      type: "function" as const,
      name: "browser_scroll",
      description: "Прокрутка по Y (положительное вниз)",
      parameters: {
        type: "object",
        properties: { deltaY: { type: "number" } },
        required: ["deltaY"],
      },
    },
    {
      type: "function" as const,
      name: "browser_wait",
      description: "Подождать N миллисекунд",
      parameters: {
        type: "object",
        properties: { ms: { type: "number" } },
        required: ["ms"],
      },
    },
    {
      type: "function" as const,
      name: "browser_back",
      description: "Назад",
      parameters: { type: "object", properties: {}, required: [] },
    },
  ];
}
