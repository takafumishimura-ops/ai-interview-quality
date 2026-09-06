import { getInterviewsWithRelations, toAggregationInput } from "@/lib/data/interviews";
import { aggregateByAdviser } from "@/lib/calculations/aggregations";
import AdviserComparisonTable from "@/components/advisers/AdviserComparisonTable";

export const dynamic = "force-dynamic";

export default async function AdvisersPage() {
  const interviews = await getInterviewsWithRelations();
  const advisers = aggregateByAdviser(toAggregationInput(interviews));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">担当者比較</h1>
      <p className="text-sm text-slate-500">
        担当CAごとの平均OS率・平均AIスコアを比較します。基準担当者を切り替えて他CAとの差分を確認できます。
      </p>
      <AdviserComparisonTable advisers={advisers} defaultBaselineName="田中" />
    </div>
  );
}
