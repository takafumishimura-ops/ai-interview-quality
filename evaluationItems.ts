/**
 * 12評価項目の単一情報源(Single Source of Truth)。
 *
 * ここに項目を追加/削除/変更するだけで、
 *  - AIへのプロンプト生成 (src/lib/openai/analyzeInterview.ts)
 *  - レスポンスの型/バリデーション (src/types/analysis.ts)
 *  - DB保存 (evaluation_items テーブルとの突合。scripts/sync-evaluation-items で同期)
 *  - UI表示 (ScoreCard, InterviewTable, AdviserComparisonTable など)
 * すべてに反映される。
 *
 * key は evaluation_items.key と一致させること(英語スラッグ、変更不可な識別子)。
 * displayOrder は画面表示順。
 */
export type EvaluationItemKey =
  | "rapport"
  | "questioning_skill"
  | "deep_diving"
  | "values_identification"
  | "issue_identification"
  | "information_structuring"
  | "proposal_match"
  | "proposal_reasoning"
  | "company_appeal"
  | "concern_confirmation"
  | "concern_resolution"
  | "closing";

export interface EvaluationItemDefinition {
  key: EvaluationItemKey;
  labelJa: string;
  description: string;
  displayOrder: number;
  /** 一覧画面のサマリー列に表示するかどうか */
  showInListSummary: boolean;
}

export const EVALUATION_ITEMS: EvaluationItemDefinition[] = [
  {
    key: "rapport",
    labelJa: "ラポール形成",
    description: "学生との信頼関係・安心感をどれだけ構築できたか",
    displayOrder: 1,
    showInListSummary: false,
  },
  {
    key: "questioning_skill",
    labelJa: "質問力",
    description: "学生の状況・考えを引き出す質問の質",
    displayOrder: 2,
    showInListSummary: false,
  },
  {
    key: "deep_diving",
    labelJa: "深掘り力",
    description: "回答に対してどれだけ本質まで掘り下げられたか",
    displayOrder: 3,
    showInListSummary: true,
  },
  {
    key: "values_identification",
    labelJa: "価値観・意思決定軸の特定",
    description: "学生の就活における意思決定軸をどれだけ特定できたか",
    displayOrder: 4,
    showInListSummary: false,
  },
  {
    key: "issue_identification",
    labelJa: "課題特定力",
    description: "学生が抱える就活上の課題をどれだけ特定できたか",
    displayOrder: 5,
    showInListSummary: false,
  },
  {
    key: "information_structuring",
    labelJa: "情報整理・言語化力",
    description: "学生の発言を整理し言語化して伝え返せているか",
    displayOrder: 6,
    showInListSummary: false,
  },
  {
    key: "proposal_match",
    labelJa: "提案企業マッチ度",
    description: "学生の価値観・課題に対する提案企業のマッチ度",
    displayOrder: 7,
    showInListSummary: true,
  },
  {
    key: "proposal_reasoning",
    labelJa: "提案理由の説明力",
    description: "なぜその企業を提案するのかの説明の質",
    displayOrder: 8,
    showInListSummary: false,
  },
  {
    key: "company_appeal",
    labelJa: "企業魅力訴求",
    description: "提案企業の魅力をどれだけ的確に訴求できたか",
    displayOrder: 9,
    showInListSummary: false,
  },
  {
    key: "concern_confirmation",
    labelJa: "懸念確認",
    description: "学生が抱える懸念をどれだけ引き出せたか",
    displayOrder: 10,
    showInListSummary: false,
  },
  {
    key: "concern_resolution",
    labelJa: "懸念払拭",
    description: "引き出した懸念をどれだけ解消できたか",
    displayOrder: 11,
    showInListSummary: false,
  },
  {
    key: "closing",
    labelJa: "クロージング",
    description: "OS(応募)に向けた最後の後押し・意思確認の質",
    displayOrder: 12,
    showInListSummary: true,
  },
];

export function getEvaluationItem(key: string): EvaluationItemDefinition | undefined {
  return EVALUATION_ITEMS.find((item) => item.key === key);
}

export const EVALUATION_ITEM_KEYS = EVALUATION_ITEMS.map((i) => i.key) as EvaluationItemKey[];
