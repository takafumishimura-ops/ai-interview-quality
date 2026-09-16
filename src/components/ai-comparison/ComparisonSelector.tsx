"use client";

import { useState } from "react";
import { ComparisonAnalysisResult } from "@/types/analysis";

export interface SelectableInterview {
  id: string;
  caName: string;
  interviewDate: string;
  hasOs: boolean;
  overallScore: number | null;
}

export default function ComparisonSelector({
  interviews,
}: {
  interviews: SelectableInterview[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonAnalysisResult | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAnalyze() {
    setLoading(true);
    setErrorMessage(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "分析に失敗しました");
      setResult(data.result);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg bg-white divide-y max-h-96 overflow-y-auto">
        {interviews.map((it) => (
          <label
            key={it.id}
            className="flex items-center gap-3 p-3 text-sm cursor-pointer hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={selected.has(it.id)}
              onChange={() => toggle(it.id)}
            />
            <span className="w-24 font-medium">{it.caName}</span>
            <span className="w-28 text-slate-500">{it.interviewDate}</span>
            <span
              className={
                it.hasOs
                  ? "text-emerald-600 text-xs font-medium"
                  : "text-slate-400 text-xs font-medium"
              }
            >
              {it.hasOs ? "OSあり" : "OSなし"}
            </span>
            <span className="text-slate-500 text-xs">
              総合スコア: {it.overallScore?.toFixed(2) ?? "未分析"}
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleAnalyze}
          disabled={selected.size < 2 || loading}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {loading ? "分析中..." : `選択した${selected.size}件を比較分析`}
        </button>
        {selected.size < 2 && (
          <span className="text-xs text-slate-400">2件以上選択してください</span>
        )}
        {errorMessage && <span className="text-red-600 text-sm">{errorMessage}</span>}
      </div>

      {result && (
        <div className="space-y-4">
          <ResultBlock title="大きな違い TOP5">
            <ol className="list-decimal list-inside space-y-1">
              {result.key_differences_top5.map((d, i) => (
                <li key={i}>
                  <span className="font-medium">{d.point}</span> — {d.detail}
                </li>
              ))}
            </ol>
          </ResultBlock>
          <ResultBlock title="高成果者が行っている行動">
            <ul className="list-disc list-inside space-y-1">
              {result.high_performer_behaviors.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </ResultBlock>
          <ResultBlock title="低成果者の改善ポイント TOP3">
            <ol className="list-decimal list-inside space-y-1">
              {result.low_performer_improvements_top3.map((d, i) => (
                <li key={i}>
                  <span className="font-medium">{d.point}</span> — {d.detail}
                </li>
              ))}
            </ol>
          </ResultBlock>
          <ResultBlock title="組織全体に展開すべきベストプラクティス">
            <ul className="list-disc list-inside space-y-1">
              {result.best_practices_to_scale.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </ResultBlock>
          <ResultBlock title="次に検証すべき仮説">
            <ul className="list-disc list-inside space-y-1">
              {result.next_hypotheses_to_test.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </ResultBlock>
        </div>
      )}
    </div>
  );
}

function ResultBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-sm text-slate-600">{children}</div>
    </div>
  );
}
