import Link from "next/link";
import { InterviewWithRelations } from "@/types/database";
import { calcOsRate, formatOsRate } from "@/lib/calculations/osRate";

function scoreOf(interview: InterviewWithRelations, key: string): number | null {
  const s = interview.scores?.find((s) => s.evaluation_item?.key === key);
  return s?.score ?? null;
}

function ScoreBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">-</span>;
  const color =
    value >= 4 ? "text-emerald-600" : value >= 3 ? "text-amber-600" : "text-red-600";
  return <span className={`font-semibold ${color}`}>{value.toFixed(1)}</span>;
}

export default function InterviewTable({
  interviews,
}: {
  interviews: InterviewWithRelations[];
}) {
  if (interviews.length === 0) {
    return (
      <p className="text-slate-500 text-sm">
        まだ面談データが登録されていません。「面談登録」から追加してください。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="p-3 text-left">担当者</th>
            <th className="p-3 text-left">面談日</th>
            <th className="p-3 text-left">OS結果</th>
            <th className="p-3 text-right">AI総合</th>
            <th className="p-3 text-right">深掘り</th>
            <th className="p-3 text-right">提案</th>
            <th className="p-3 text-right">クロージング</th>
            <th className="p-3 text-left"></th>
          </tr>
        </thead>
        <tbody>
          {interviews.map((it) => (
            <tr key={it.id} className="border-t hover:bg-slate-50">
              <td className="p-3">{it.ca?.name}</td>
              <td className="p-3">{it.interview_date}</td>
              <td className="p-3">
                {it.has_os ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-medium">
                    OSあり ({formatOsRate(calcOsRate(it.os_count, it.proposed_company_count))})
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                    OSなし
                  </span>
                )}
              </td>
              <td className="p-3 text-right">
                <ScoreBadge value={it.analysis?.overall_score ?? null} />
              </td>
              <td className="p-3 text-right">
                <ScoreBadge value={scoreOf(it, "deep_diving")} />
              </td>
              <td className="p-3 text-right">
                <ScoreBadge value={scoreOf(it, "proposal_match")} />
              </td>
              <td className="p-3 text-right">
                <ScoreBadge value={scoreOf(it, "closing")} />
              </td>
              <td className="p-3 text-right">
                <Link href={`/interviews/${it.id}`} className="text-brand-600 hover:underline">
                  詳細
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
