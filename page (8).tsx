import { notFound } from "next/navigation";
import { getInterviewWithRelations } from "@/lib/data/interviews";
import { calcOsRate, formatOsRate } from "@/lib/calculations/osRate";
import AnalyzeButton from "@/components/interviews/AnalyzeButton";
import ScoreCard from "@/components/interviews/ScoreCard";

export const dynamic = "force-dynamic";

export default async function InterviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const interview = await getInterviewWithRelations(params.id);
  if (!interview) notFound();

  const osRate = calcOsRate(interview.os_count, interview.proposed_company_count);
  const analysis = interview.analysis;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">
            面談詳細 — {interview.ca?.name} / {interview.student?.student_code}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {interview.interview_date} ・ {interview.interview_type} ・ 提案企業数:{" "}
            {interview.proposed_company_count} ・ OS数: {interview.os_count} ・ OS率:{" "}
            {formatOsRate(osRate)}
          </p>
        </div>
        <AnalyzeButton interviewId={interview.id} alreadyAnalyzed={!!analysis} />
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-white">
            <h2 className="font-semibold mb-2">会話メトリクス</h2>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>CA発話比率: {analysis.ca_talk_ratio}%</li>
              <li>学生発話比率: {analysis.student_talk_ratio}%</li>
              <li>質問数: {analysis.question_count}</li>
              <li>深掘り質問数: {analysis.deep_question_count}</li>
              <li>AI総合スコア: {analysis.overall_score?.toFixed(2)} / 5</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4 bg-white">
            <h2 className="font-semibold mb-2">学生インサイト</h2>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>主要価値観: {(analysis.student_key_values ?? []).join(" / ")}</li>
              <li>就活課題: {(analysis.student_challenges ?? []).join(" / ")}</li>
              <li>懸念: {(analysis.student_concerns ?? []).join(" / ")}</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4 bg-white md:col-span-2">
            <h2 className="font-semibold mb-2">OS率に影響した可能性が高い要素 TOP3</h2>
            <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
              {(analysis.os_impact_factors ?? []).map((f, i) => (
                <li key={i}>
                  <span className="font-medium text-slate-800">{f.factor}</span> — {f.reasoning}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {analysis && (
        <div>
          <h2 className="font-bold mb-3">評価項目別スコア(12項目)</h2>
          <ScoreCard scores={interview.scores} />
        </div>
      )}

      <details className="border rounded-lg bg-white p-4">
        <summary className="cursor-pointer font-semibold">面談文字起こし</summary>
        <pre className="whitespace-pre-wrap text-sm text-slate-700 mt-3 font-mono">
          {interview.transcript}
        </pre>
      </details>
    </div>
  );
}
