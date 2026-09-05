import { EVALUATION_ITEM_KEYS, EvaluationItemKey } from "@/config/evaluationItems";
import { calcOsRate } from "./osRate";

/** 集計処理の入力として使う、面談1件分のフラットなデータ形状 */
export interface InterviewForAggregation {
  id: string;
  caId: string;
  caName: string;
  osCount: number;
  proposedCompanyCount: number;
  hasOs: boolean;
  overallScore: number | null;
  itemScores: Partial<Record<EvaluationItemKey, number>>;
}

export interface AdviserAggregate {
  caId: string;
  caName: string;
  interviewCount: number;
  avgOsRate: number;
  avgOverallScore: number | null;
  avgByItem: Partial<Record<EvaluationItemKey, number>>;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** 機能4: 担当者比較 用の集計 */
export function aggregateByAdviser(
  interviews: InterviewForAggregation[]
): AdviserAggregate[] {
  const byCa = new Map<string, InterviewForAggregation[]>();
  for (const it of interviews) {
    const list = byCa.get(it.caId) ?? [];
    list.push(it);
    byCa.set(it.caId, list);
  }

  const result: AdviserAggregate[] = [];
  for (const [caId, list] of byCa.entries()) {
    const avgByItem: Partial<Record<EvaluationItemKey, number>> = {};
    for (const key of EVALUATION_ITEM_KEYS) {
      const scores = list
        .map((it) => it.itemScores[key])
        .filter((v): v is number => typeof v === "number");
      const avg = average(scores);
      if (avg !== null) avgByItem[key] = avg;
    }

    result.push({
      caId,
      caName: list[0].caName,
      interviewCount: list.length,
      avgOsRate:
        average(
          list.map((it) => calcOsRate(it.osCount, it.proposedCompanyCount))
        ) ?? 0,
      avgOverallScore: average(
        list.map((it) => it.overallScore).filter((v): v is number => v !== null)
      ),
      avgByItem,
    });
  }

  // 面談件数が多い順(サンプル数が少ない担当者を目立たせすぎないため)
  return result.sort((a, b) => b.interviewCount - a.interviewCount);
}

export interface OutcomeGroupAggregate {
  label: "os" | "no_os";
  interviewCount: number;
  avgByItem: Partial<Record<EvaluationItemKey, number>>;
}

export interface OutcomeItemDiff {
  key: EvaluationItemKey;
  osAvg: number | null;
  noOsAvg: number | null;
  diff: number; // osAvg - noOsAvg
}

/** 機能5: 成果比較(OS有無) 用の集計 */
export function aggregateByOutcome(interviews: InterviewForAggregation[]): {
  os: OutcomeGroupAggregate;
  noOs: OutcomeGroupAggregate;
  diffs: OutcomeItemDiff[];
} {
  const osGroup = interviews.filter((it) => it.hasOs);
  const noOsGroup = interviews.filter((it) => !it.hasOs);

  function buildGroup(
    label: "os" | "no_os",
    list: InterviewForAggregation[]
  ): OutcomeGroupAggregate {
    const avgByItem: Partial<Record<EvaluationItemKey, number>> = {};
    for (const key of EVALUATION_ITEM_KEYS) {
      const scores = list
        .map((it) => it.itemScores[key])
        .filter((v): v is number => typeof v === "number");
      const avg = average(scores);
      if (avg !== null) avgByItem[key] = avg;
    }
    return { label, interviewCount: list.length, avgByItem };
  }

  const os = buildGroup("os", osGroup);
  const noOs = buildGroup("no_os", noOsGroup);

  const diffs: OutcomeItemDiff[] = EVALUATION_ITEM_KEYS.map((key) => {
    const osAvg = os.avgByItem[key] ?? null;
    const noOsAvg = noOs.avgByItem[key] ?? null;
    const diff = osAvg !== null && noOsAvg !== null ? osAvg - noOsAvg : 0;
    return { key, osAvg, noOsAvg, diff };
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return { os, noOs, diffs };
}
