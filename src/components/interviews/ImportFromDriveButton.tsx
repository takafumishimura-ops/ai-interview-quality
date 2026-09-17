"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ImportResponse {
  imported: number;
  skippedAlreadyImported: number;
  errors: string[];
}

export default function ImportFromDriveButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleImport() {
    setState("running");
    setErrorMessage(null);
    setResult(null);
    try {
      const res = await fetch("/api/interviews/import-from-drive", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "取り込みに失敗しました");
      setResult(data);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
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
        Googleドライブを確認中...(数十秒かかる場合があります)
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
            {result?.imported ?? 0}件を新しく取り込みました
            {result && result.skippedAlreadyImported > 0 && (
              <>(取り込み済み {result.skippedAlreadyImported}件はスキップ)</>
            )}
          </p>
          {result && result.errors.length > 0 && (
            <ul className="text-red-600 text-xs list-disc list-inside">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
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
