import { getInterviewsWithRelations } from "@/lib/data/interviews";
import ComparisonSelector, {
  SelectableInterview,
} from "@/components/ai-comparison/ComparisonSelector";

export const dynamic = "force-dynamic";

export default async function AiComparisonPage() {
  const interviews = await getInterviewsWithRelations();

  const selectable: SelectableInterview[] = interviews.map((it) => ({
    id: it.id,
    caName: it.ca?.name ?? "不明",
    interviewDate: it.interview_date,
    hasOs: it.has_os,
    overallScore: it.analysis?.overall_score ?? null,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">AI比較分析</h1>
      <p className="text-sm text-slate-500">
        複数の面談を選択し、「成果の高い面談と低い面談では何が違うか」をAIに分析させます。事前にAI面談分析(スコアリング)を実行しておくと、より精度の高い比較ができます。
      </p>
      <ComparisonSelector interviews={selectable} />
    </div>
  );
}
