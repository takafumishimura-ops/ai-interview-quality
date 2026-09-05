import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY が設定されていません。.env.local を確認してください");
  }
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
