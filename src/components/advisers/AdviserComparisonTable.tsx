"use client";

import { useMemo, useState } from "react";
import { EVALUATION_ITEMS } from "@/config/evaluationItems";
import { AdviserAggregate, SCORE_THRESHOLD } from "@/lib/calculations/aggregations";
import { formatOsRate } from "@/lib/calculations/osRate";

function diffColor(diff: number) {
  if (diff > 0.15) return "text-emerald-600";
  if (diff < -0.15) return "text-red-600";
  return "text-slate-500";
}

/** 基準値(SCORE_THRESHOLD)を下回っているセルを目立たせる背景色 */
function thresholdBg(value: number | undefined) {
  return value !== undefined && value < SCORE_THRESHOLD ? "bg-red-50" : "";
}

export default function AdviserComparisonTable({
  advisers,
  defaultBaselineName,
}: {
  advisers: AdviserAggregate[];
  defaultBaselineName?: string;
}) {
  const defaultBaseline = useMemo(
    () => advisers.find((a) => a.caName === defaultBaselineName)?.caId ?? advisers[0]?.caId,
    [advisers, defaultBaselineName]
  );
  const [baselineId, setBaselineId] = useState<string | undefined>(defaultBaseline);

  const baseline = advisers.find((a) => a.caId === baselineId);
  const others = advisers.filter((a) => a.caId !== baselineId);

  if (advisers.length === 0) {
    return <p className="text-slate-500 text-sm">まだ集計できる面談データがありません。</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">基準担当者:</label>
        <select
          className="border rounded-md px-3 py-1.5 text-sm"
          value={baselineId}
          onChange={(e) => setBaselineId(e.target.value)}
        >
          {advisers.map((a) => (
            <option key={a.caId} value={a.caId}>
              {a.caName}
            </option>
          ))}
        </select>
      </div>

      {baseline && (
        <div className="overflow-x-auto border rounded-lg bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-3 text-left">項目</th>
                <th className="p-3 text-right">{baseline.caName}(基準)</th>
                {others.map((o) => (
                  <th key={o.caId} className="p-3 text-right">
                    {o.caName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t bg-slate-50/50 font-medium">
                <td className="p-3">面談件数</td>
                <td className="p-3 text-right">{baseline.interviewCount}</td>
                {others.map((o) => (
                  <td key={o.caId} className="p-3 text-right">
                    {o.interviewCount}
                  </td>
                ))}
              </tr>
              <tr className="border-t font-medium">
                <td className="p-3">平均OS率</td>
                <td className="p-3 text-right">{formatOsRate(baseline.avgOsRate)}</td>
                {others.map((o) => {
                  const diff = o.avgOsRate - baseline.avgOsRate;
                  return (
                    <td key={o.caId} className={`p-3 text-right ${diffColor(diff)}`}>
                      {formatOsRate(o.avgOsRate)}{" "}
                      <span className="text-xs">
                        ({diff >= 0 ? "+" : ""}
                        {(diff * 100).toFixed(1)}pt)
                      </span>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t font-medium">
                <td className="p-3">平均AI総合スコア</td>
                <td className="p-3 text-right">
                  {baseline.avgOverallScore?.toFixed(2) ?? "-"}
                </td>
                {others.map((o) => (
                  <td key={o.caId} className="p-3 text-right">
                    {o.avgOverallScore?.toFixed(2) ?? "-"}
                  </td>
                ))}
              </tr>
              {EVALUATION_ITEMS.map((item) => (
                <tr key={item.key} className="border-t">
                  <td className="p-3 text-slate-600">{item.labelJa}</td>
                  <td
                    className={`p-3 text-right ${thresholdBg(baseline.avgByItem[item.key])}`}
                  >
                    {baseline.avgByItem[item.key]?.toFixed(2) ?? "-"}
                  </td>
                  {others.map((o) => {
                    const b = baseline.avgByItem[item.key];
                    const v = o.avgByItem[item.key];
                    const diff = b !== undefined && v !== undefined ? v - b : 0;
                    return (
                      <td
                        key={o.caId}
                        className={`p-3 text-right ${diffColor(diff)} ${thresholdBg(v)}`}
                      >
                        {v?.toFixed(2) ?? "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 p-3 border-t bg-slate-50">
            背景が赤い項目は、平均スコアが基準値({SCORE_THRESHOLD})を下回っています。
          </p>
        </div>
      )}

      <div>
        <h2 className="font-bold mb-3">担当者ごとの最優先課題(基準値 {SCORE_THRESHOLD} 未満の項目)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advisers.map((a) => (
            <div key={a.caId} className="border rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800">{a.caName}</h3>
                <span className="text-xs text-slate-400">面談{a.interviewCount}件</span>
              </div>

              {a.topPriority ? (
                <div className="space-y-3">
                  <div className="border border-red-200 bg-red-50 rounded-md p-3">
                    <p className="text-xs text-red-600 font-medium mb-1">
                      最優先で取り組むべき項目
                    </p>
                    <p className="font-semibold text-slate-800">
                      {a.topPriority.labelJa}{" "}
                      <span className="text-red-600">
                        (平均 {a.topPriority.avgScore.toFixed(2)})
                      </span>
                    </p>
                    {a.topPriority.examples.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc list-inside">
                        {a.topPriority.examples.map((ex, i) => (
                          <li key={i}>
                            <span className="text-xs text-slate-400">
                              ({ex.interviewDate} ・ {ex.score}点)
                            </span>{" "}
                            {ex.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {a.belowThresholdItems.length > 1 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        その他、基準値を下回っている項目
                      </p>
                      <ul className="text-sm text-slate-600 space-y-0.5">
                        {a.belowThresholdItems.slice(1).map((it) => (
                          <li key={it.key}>
                            {it.labelJa}(平均 {it.avgScore.toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-emerald-600">
                  基準値({SCORE_THRESHOLD})を下回っている項目はありません。
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
