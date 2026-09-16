import { getEvaluationItem } from "@/config/evaluationItems";
import { OutcomeGroupAggregate, OutcomeItemDiff } from "@/lib/calculations/aggregations";

export default function OutcomeComparisonTable({
  os,
  noOs,
  diffs,
}: {
  os: OutcomeGroupAggregate;
  noOs: OutcomeGroupAggregate;
  diffs: OutcomeItemDiff[];
}) {
  if (os.interviewCount === 0 || noOs.interviewCount === 0) {
    return (
      <p className="text-slate-500 text-sm">
        比較には「OSした面談」と「OSしなかった面談」の両方が、AI分析済みの状態で1件以上必要です。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-200">
          <p className="font-semibold text-emerald-700">OSした面談</p>
          <p className="text-slate-600">{os.interviewCount}件</p>
        </div>
        <div className="border rounded-lg p-4 bg-slate-50">
          <p className="font-semibold text-slate-700">OSしなかった面談</p>
          <p className="text-slate-600">{noOs.interviewCount}件</p>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-3 text-left">評価項目</th>
              <th className="p-3 text-right">OSした面談 平均</th>
              <th className="p-3 text-right">OSしなかった面談 平均</th>
              <th className="p-3 text-right">差分</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d) => {
              const label = getEvaluationItem(d.key)?.labelJa ?? d.key;
              const isBigGap = Math.abs(d.diff) >= 0.5;
              return (
                <tr key={d.key} className={`border-t ${isBigGap ? "bg-amber-50" : ""}`}>
                  <td className="p-3">
                    {label} {isBigGap && <span className="text-amber-600 text-xs ml-1">要注目</span>}
                  </td>
                  <td className="p-3 text-right">{d.osAvg?.toFixed(2) ?? "-"}</td>
                  <td className="p-3 text-right">{d.noOsAvg?.toFixed(2) ?? "-"}</td>
                  <td
                    className={`p-3 text-right font-semibold ${
                      d.diff > 0 ? "text-emerald-600" : d.diff < 0 ? "text-red-600" : "text-slate-400"
                    }`}
                  >
                    {d.diff >= 0 ? "+" : ""}
                    {d.diff.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
