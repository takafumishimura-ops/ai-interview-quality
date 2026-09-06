import { ComparisonAnalysisResult } from "@/types/analysis";
import { getOpenAIClient, OPENAI_MODEL } from "./client";

export interface ComparisonTargetInterview {
  interviewId: string;
  caName: string;
  hasOs: boolean;
  overallScore: number | null;
  transcriptExcerpt: string;
}

function buildSystemPrompt(): string {
  return `あなたは新卒人材紹介事業の面談品質を分析するコンサルタントです。
複数のCA面談(成果が高い=OSした面談 / 成果が低い=OSしなかった面談 が混在)を比較し、
何が成果の差を生んでいるかを分析してください。

出力は必ず下記のJSON形式のみで返してください。説明文やマークダウンのコードブロックは付けないでください。

{
  "key_differences_top5": [{ "point": string, "detail": string }],
  "high_performer_behaviors": string[],
  "low_performer_improvements_top3": [{ "point": string, "detail": string }],
  "best_practices_to_scale": string[],
  "next_hypotheses_to_test": string[]
}`;
}

function buildUserPrompt(interviews: ComparisonTargetInterview[]): string {
  const blocks = interviews
    .map((it, idx) => {
      return `【面談${idx + 1}】担当CA: ${it.caName} / OS: ${it.hasOs ? "あり" : "なし"} / AI総合スコア: ${
        it.overallScore ?? "未分析"
      }
${it.transcriptExcerpt}`;
    })
    .join("\n\n");

  return `以下は分析対象の面談一覧です(文字起こしは要点抜粋の場合があります)。\n\n${blocks}`;
}

function validateResult(parsed: any): ComparisonAnalysisResult {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AIレスポンスがJSONオブジェクトではありません");
  }
  const requiredArrayKeys = [
    "key_differences_top5",
    "high_performer_behaviors",
    "low_performer_improvements_top3",
    "best_practices_to_scale",
    "next_hypotheses_to_test",
  ];
  for (const key of requiredArrayKeys) {
    if (!Array.isArray(parsed[key])) {
      throw new Error(`AIレスポンスに "${key}" の配列が存在しません`);
    }
  }
  return parsed as ComparisonAnalysisResult;
}

export async function compareInterviews(
  interviews: ComparisonTargetInterview[]
): Promise<{ result: ComparisonAnalysisResult; rawResponse: unknown; model: string }> {
  if (interviews.length < 2) {
    throw new Error("比較分析には2件以上の面談を選択してください");
  }

  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(interviews) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAIからのレスポンスが空でした");
  }

  const parsed = JSON.parse(content);
  const result = validateResult(parsed);

  return { result, rawResponse: parsed, model: OPENAI_MODEL };
}
