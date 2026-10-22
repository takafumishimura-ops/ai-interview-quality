"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INTERVIEW_TYPES = ["初回面談", "複数回目面談", "内定者面談", "その他"];

export default function EditInterviewMetaForm({
  interviewId,
  initialCaName,
  initialStudentName,
  initialInterviewDate,
  initialInterviewType,
}: {
  interviewId: string;
  initialCaName: string;
  initialStudentName: string;
  initialInterviewDate: string;
  initialInterviewType: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [caName, setCaName] = useState(initialCaName);
  const [studentName, setStudentName] = useState(initialStudentName);
  const [interviewDate, setInterviewDate] = useState(initialInterviewDate);
  const [interviewType, setInterviewType] = useState(initialInterviewType);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caName, studentName, interviewDate, interviewType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新に失敗しました");
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-brand-600 hover:underline"
      >
        担当CA名・学生名などを編集
      </button>
    );
  }

  return (
    <div className="border rounded-md p-3 bg-slate-50 space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block mb-1 text-xs font-medium text-slate-600">担当CA名</span>
          <input
            className="w-full border rounded px-2 py-1"
            value={caName}
            onChange={(e) => setCaName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="block mb-1 text-xs font-medium text-slate-600">学生名</span>
          <input
            className="w-full border rounded px-2 py-1"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="block mb-1 text-xs font-medium text-slate-600">面談日</span>
          <input
            type="date"
            className="w-full border rounded px-2 py-1"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="block mb-1 text-xs font-medium text-slate-600">面談種別</span>
          <select
            className="w-full border rounded px-2 py-1"
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value)}
          >
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      {errorMessage && <p className="text-red-600 text-xs">{errorMessage}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="px-3 py-1.5 rounded-md border text-slate-600 hover:bg-slate-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
