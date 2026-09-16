"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteInterviewButton({
  interviewId,
}: {
  interviewId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "削除に失敗しました");
      router.push("/interviews");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600">本当に削除しますか？(元に戻せません)</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {loading ? "削除中..." : "削除する"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="px-3 py-1.5 rounded-md border text-slate-600 hover:bg-slate-50"
        >
          キャンセル
        </button>
        {errorMessage && <p className="text-red-600 text-sm">{errorMessage}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm text-red-600 hover:underline"
    >
      この面談を削除
    </button>
  );
}
