"use client";

import { useMemo, useState } from "react";
import { EVALUATION_ITEMS } from "@/config/evaluationItems";
import { AdviserAggregate } from "@/lib/calculations/aggregations";
import { formatOsRate } from "@/lib/calculations/osRate";

function diffColor(diff: number) {
  if (diff > 0.15) return "text-emerald-600";
  if (diff < -0.15) return "text-red-600";
  return "text-slate-500";
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
                  <td className="p-3 text-right">
                    {baseline.avgByItem[item.key]?.toFixed(2) ?? "-"}
                  </td>
                  {others.map((o) => {
                    const b = baseline.avgByItem[item.key];
                    const v = o.avgByItem[item.key];
                    const diff = b !== undefined && v !== undefined ? v - b : 0;
                    return (
                      <td key={o.caId} className={`p-3 text-right ${diffColor(diff)}`}>
                        {v?.toFixed(2) ?? "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
