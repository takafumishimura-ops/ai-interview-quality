"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ImportResponse {
  imported: number;
  skippedAlreadyImported: number;
  duplicatesIgnored: number;
  remaining: number;
  errors: string[];
  failedIds: string[];
}

/** 無限に繰り返さないための安全装置(1回あたり十数件 × この回数) */
const MAX_ROUNDS = 60;

export default function ImportFromDriveButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState({ imported: 0, remaining: null as number | null });
  const [summary, setSummary] = useState<{
    imported: number;
    skippedAlreadyImported: number;
    duplicatesIgnored: number;
    remaining: number;
    errors: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleImport() {
    setState("running");
    setErrorMessage(null);
    setSummary(null);
    setProgress({ imported: 0, remaining: null });

    let totalImported = 0;
    let skippedAlreadyImported = 0;
    let duplicatesIgnored = 0;
    let remaining = 0;
    const allErrors: string[] = [];
    const skipIds: string[] = [];

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await fetch("/api/interviews/import-from-drive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skipIds }),
        });
        const data: ImportResponse & { error?: string } = await res.json();
        if (!res.ok) throw new Error(data.error ?? "取り込みに失敗しました");

        totalImported += data.imported;
        skippedAlreadyImported = data.skippedAlreadyImported;
        duplicatesIgnored = data.duplicatesIgnored;
        remaining = data.remaining;
        allErrors.push(...data.errors);
        skipIds.push(...data.failedIds);
        setProgress({ imported: totalImported, remaining: data.remaining });

        // 残りが無い、またはこの回で何も処理できなかったら終了
        if (data.remaining === 0 || data.imported + data.failedIds.length === 0) break;
      }
      setSummary({
        imported: totalImported,
        skippedAlreadyImported,
        duplicatesIgnored,
        remaining,
        errors: allErrors,
      });
      router.refresh();
    } catch (err: any) {
      // 途中まで取り込めた分があれば画面に反映する
      if (totalImported > 0) router.refresh();
      setErrorMessage(
        totalImported > 0
          ? `${err.message}(ここまでに ${totalImported}件を取り込みました。もう一度押すと続きから取り込みます)`
          : err.message
      );
    } finally {
      setState("done");
    }
  }

  if (state === "idle") {
    return (
      <button
        onClick={handleImport}
        className="border border-brand-600 text-brand-600 hover:bg-brand-50 px-4 py-2 rounded-md text-sm"
      >
        Googleドライブから取り込む
      </button>
    );
  }

  if (state === "running") {
    return (
      <div className="text-sm bg-white border rounded-md px-3 py-2">
        取り込み中...(ここまで {progress.imported}件
        {progress.remaining !== null && <>、残り約 {progress.remaining}件</>}
        )このまま画面を閉じずにお待ちください
      </div>
    );
  }

  // done
  return (
    <div className="text-sm bg-white border rounded-md px-3 py-2 space-y-1 max-w-md">
      {errorMessage ? (
        <p className="text-red-600">{errorMessage}</p>
      ) : (
        <>
          <p>
            {summary?.imported ?? 0}件を新しく取り込みました
            {summary && summary.skippedAlreadyImported > 0 && (
              <>(取り込み済み {summary.skippedAlreadyImported}件はスキップ)</>
            )}
          </p>
          {summary && summary.duplicatesIgnored > 0 && (
            <p className="text-xs text-slate-500">
              同じ面談の重複 {summary.duplicatesIgnored}件(Googleドキュメントと.docx)は1件にまとめました
            </p>
          )}
          {summary && summary.remaining > 0 && (
            <p className="text-xs text-amber-600">
              まだ {summary.remaining}件が残っています。もう一度押してください。
            </p>
          )}
          {summary && summary.errors.length > 0 && (
            <ul className="text-red-600 text-xs list-disc list-inside">
              {summary.errors.slice(0, 10).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {summary.errors.length > 10 && (
                <li>ほか {summary.errors.length - 10}件</li>
              )}
            </ul>
          )}
        </>
      )}
      <button
        onClick={() => setState("idle")}
        className="text-brand-600 hover:underline text-xs"
      >
        閉じる
      </button>
    </div>
  );
}
