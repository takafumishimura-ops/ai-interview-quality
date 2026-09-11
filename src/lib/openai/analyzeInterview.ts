import { EVALUATION_ITEMS } from "@/config/evaluationItems";
import { InterviewAnalysisResult } from "@/types/analysis";
import { getOpenAIClient, OPENAI_MODEL } from "./client";

export interface AnalyzeInterviewInput {
  transcript: string;
  interviewType: string;
  proposedCompanies: string[];
}

function buildScoreSchemaDescription(): string {
  return EVALUATION_ITEMS.map(
    (item) =>
      `  - ${item.key} (${item.labelJa}): ${item.description}`
  ).join("\n");
}

function buildSystemPrompt(): string {
  return `あなたは新卒人材紹介事業のキャリアアドバイザー(CA)面談を評価する専門家です。
与えられた面談の文字起こしを読み、下記12項目それぞれを1〜5点(5が最高)で評価してください。

評価項目:
${buildScoreSchemaDescription()}

各項目について score(1-5の整数), reason(評価理由), good_points(良かった点), improvement_points(改善点) を日本語で出力してください。
improvement_points は「〇〇が不足していた」のような抽象的な指摘だけで終わらせず、実際の面談内容を踏まえて「この場面では、実際にはこう言っていたが、こう言い換えると良かった」「ここで、こういう質問を挟むと良かった」というように、具体的な発言例や行動例を含めてください。

さらに以下の会話メトリクス・学生インサイトも抽出してください:
- ca_talk_ratio / student_talk_ratio: CAと学生の発話比率(%, 合計100に近い値)
- question_count: CAが投げた質問の総数
- deep_question_count: その中で深掘り質問と言えるものの数
- proposed_company_count: 実際に提案された企業数
- key_values: 学生が重視している価値観(配列)
- job_search_challenges: 学生の就活における課題(配列)
- concerns: 学生が示した懸念点(配列)
- os_impact_factors_top3: OS(応募)の有無に影響した可能性が高い要素を重要度順に3つ、それぞれ factor と reasoning を付けて

さらに、このCAが次回以降の面談で実践できる具体的な改善アクションを next_action_suggestions として3つ出力してください。
- 12項目の中で特にスコアが低かった項目を優先して取り上げること
- それぞれ target_item_key(該当する評価項目のkey。特定の項目に紐づかない場合は null), title(短い見出し), suggestion(次回の面談で実際に使える具体的なセリフ例・行動例を含めた提案文)を含めること
- 抽象的な一般論(例:「もっと深掘りしましょう」)ではなく、この面談の内容に即した、すぐ実践できる提案にすること

出力は必ず下記のJSON形式のみで返してください。説明文やマークダウンのコードブロックは付けないでください。

{
  "scores": {
    "<item_key>": { "score": number, "reason": string, "good_points": string, "improvement_points": string },
    ...
  },
  "conversation_metrics": {
    "ca_talk_ratio": number,
    "student_talk_ratio": number,
    "question_count": number,
    "deep_question_count": number,
    "proposed_company_count": number
  },
  "student_insights": {
    "key_values": string[],
    "job_search_challenges": string[],
    "concerns": string[]
  },
  "os_impact_factors_top3": [{ "factor": string, "reasoning": string }],
  "next_action_suggestions": [
    { "target_item_key": string | null, "title": string, "suggestion": string }
  ]
}`;
}

function buildUserPrompt(input: AnalyzeInterviewInput): string {
  return `面談種別: ${input.interviewType}
提案企業: ${input.proposedCompanies.join(", ") || "(なし)"}

--- 面談文字起こし ---
${input.transcript}
--- 文字起こしここまで ---`;
}

/** レスポンスJSONが評価項目を過不足なく含むかを検証する */
function validateResult(parsed: any): InterviewAnalysisResult {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AIレスポンスがJSONオブジェクトではありません");
  }
  const scores = parsed.scores;
  if (!scores || typeof scores !== "object") {
    throw new Error("AIレスポンスに scores がありません");
  }
  for (const item of EVALUATION_ITEMS) {
    const s = scores[item.key];
    if (!s || typeof s.score !== "number") {
      throw new Error(`評価項目 "${item.key}" のスコアがAIレスポンスに存在しません`);
    }
  }
  return parsed as InterviewAnalysisResult;
}

export async function analyzeInterview(
  input: AnalyzeInterviewInput
): Promise<{ result: InterviewAnalysisResult; rawResponse: unknown; model: string }> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(input) },
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
