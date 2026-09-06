import Link from "next/link";
import InterviewTable from "@/components/interviews/InterviewTable";
import { getInterviewsWithRelations } from "@/lib/data/interviews";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const interviews = await getInterviewsWithRelations();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">面談一覧</h1>
        <Link
          href="/interviews/new"
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm"
        >
          + 面談を登録
        </Link>
      </div>
      <InterviewTable interviews={interviews} />
    </div>
  );
}
