import { EVALUATION_ITEMS } from "@/config/evaluationItems";
import { InterviewScoreRow, EvaluationItemRow } from "@/types/database";

type ScoreWithItem = InterviewScoreRow & { evaluation_item: EvaluationItemRow };

export default function ScoreCard({ scores }: { scores: ScoreWithItem[] }) {
  const byKey = new Map(scores.map((s) => [s.evaluation_item?.key, s]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {EVALUATION_ITEMS.map((item) => {
        const s = byKey.get(item.key);
        return (
          <div key={item.key} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-800">{item.labelJa}</h3>
              <span
                className={`text-lg font-bold ${
                  !s
                    ? "text-slate-300"
                    : s.score >= 4
                    ? "text-emerald-600"
                    : s.score >= 3
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {s ? `${s.score} / 5` : "未分析"}
              </span>
            </div>
            {s && (
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-500">評価理由: </span>
                  {s.reason}
                </p>
                <p>
                  <span className="font-medium text-emerald-600">良かった点: </span>
                  {s.good_points}
                </p>
                <p>
                  <span className="font-medium text-red-600">改善点: </span>
                  {s.improvement_points}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
