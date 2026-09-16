"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BulkReanalyzeButton({
  interviewIds,
}: {
  interviewIds: string[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  async function handleRun() {
    setRunning(true);
    setDone(0);
    setErrors([]);
    setFinished(false);

    const failed: string[] = [];
    for (let i = 0; i < interviewIds.length; i++) {
      try {
        const res = await fetch(`/api/interviews/${interviewIds[i]}/analyze`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          failed.push(`${i + 1}件目: ${data.error ?? "分析に失敗しました"}`);
        }
      } catch (err: any) {
        failed.push(`${i + 1}件目: ${err.message ?? "通信エラー"}`);
      }
      setDone(i + 1);
    }

    setErrors(failed);
    setRunning(false);
    setFinished(true);
    router.refresh();
  }

  if (interviewIds.length === 0) return null;

  if (!confirming && !finished) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="border border-brand-600 text-brand-600 hover:bg-brand-50 px-4 py-2 rounded-md text-sm"
      >
        すべて再分析({interviewIds.length}件)
      </button>
    );
  }

  if (confirming && !running && !finished) {
    return (
      <div className="flex items-center gap-2 text-sm bg-white border rounded-md px-3 py-2">
        <span className="text-slate-600">
          全{interviewIds.length}件を今の評価基準で再分析します。件数分のOpenAI利用料が発生し、数分かかる場合があります。よろしいですか？
        </span>
        <button
          onClick={handleRun}
          className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md whitespace-nowrap"
        >
          実行する
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded-md border text-slate-600 hover:bg-slate-50 whitespace-nowrap"
        >
          キャンセル
        </button>
      </div>
    );
  }

  if (running) {
    return (
      <div className="text-sm bg-white border rounded-md px-3 py-2">
        再分析中... {done} / {interviewIds.length} 件完了
      </div>
    );
  }

  // finished
  return (
    <div className="text-sm bg-white border rounded-md px-3 py-2 space-y-1">
      <p>
        {interviewIds.length}件中 {interviewIds.length - errors.length}件成功、{errors.length}
        件失敗しました。
      </p>
      {errors.length > 0 && (
        <ul className="text-red-600 text-xs list-disc list-inside">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <button
        onClick={() => {
          setFinished(false);
          setConfirming(false);
        }}
        className="text-brand-600 hover:underline text-xs"
      >
        閉じる
      </button>
    </div>
  );
}
