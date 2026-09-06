import { getInterviewsWithRelations, toAggregationInput } from "@/lib/data/interviews";
import { aggregateByOutcome } from "@/lib/calculations/aggregations";
import OutcomeComparisonTable from "@/components/comparison/OutcomeComparisonTable";

export const dynamic = "force-dynamic";

export default async function ComparisonPage() {
  const interviews = await getInterviewsWithRelations();
  const { os, noOs, diffs } = aggregateByOutcome(toAggregationInput(interviews));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">成果比較(OS有無)</h1>
      <p className="text-sm text-slate-500">
        「OSした面談」と「OSしなかった面談」の評価項目別平均を比較し、差が大きい項目を上位に表示します。
      </p>
      <OutcomeComparisonTable os={os} noOs={noOs} diffs={diffs} />
    </div>
  );
}
