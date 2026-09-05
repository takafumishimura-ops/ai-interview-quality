"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalyzeButton({
  interviewId,
  alreadyAnalyzed,
}: {
  interviewId: string;
  alreadyAnalyzed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI分析に失敗しました");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
      >
        {loading ? "AI分析中..." : alreadyAnalyzed ? "AI分析を再実行" : "AI分析を実行"}
      </button>
      {errorMessage && <p className="text-red-600 text-sm">{errorMessage}</p>}
    </div>
  );
}
