"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calcOsRate, formatOsRate } from "@/lib/calculations/osRate";

const INTERVIEW_TYPES = ["初回面談", "複数回目面談", "内定者面談", "その他"];

export default function InterviewForm() {
  const router = useRouter();
  const [caName, setCaName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [interviewDate, setInterviewDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [interviewType, setInterviewType] = useState(INTERVIEW_TYPES[0]);
  const [transcript, setTranscript] = useState("");
  const [proposedCompaniesText, setProposedCompaniesText] = useState("");
  const [osCount, setOsCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const proposedCompanies = useMemo(
    () =>
      proposedCompaniesText
        .split(/[\n,、]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [proposedCompaniesText]
  );
  const proposedCompanyCount = proposedCompanies.length;
  const hasOs = osCount > 0;
  const osRate = calcOsRate(osCount, proposedCompanyCount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caName,
          studentCode,
          interviewDate,
          interviewType,
          transcript,
          proposedCompanies,
          proposedCompanyCount,
          osCount,
          hasOs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登録に失敗しました");

      router.push(`/interviews/${data.interview.id}`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg border">
      <div className="grid grid-cols-2 gap-4">
        <Field label="担当CA名" required>
          <input
            className="input"
            value={caName}
            onChange={(e) => setCaName(e.target.value)}
            placeholder="例: 田中"
            required
          />
        </Field>
        <Field label="学生ID" required>
          <input
            className="input"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            placeholder="例: STU-2026-0001"
            required
          />
        </Field>
        <Field label="面談日" required>
          <input
            type="date"
            className="input"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            required
          />
        </Field>
        <Field label="面談種別" required>
          <select
            className="input"
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value)}
          >
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="提案企業(改行またはカンマ区切り)">
        <textarea
          className="input h-20"
          value={proposedCompaniesText}
          onChange={(e) => setProposedCompaniesText(e.target.value)}
          placeholder={"株式会社A\n株式会社B"}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4 items-end">
        <Field label="提案企業数(自動計算)">
          <input className="input bg-slate-100" value={proposedCompanyCount} readOnly />
        </Field>
        <Field label="OS数">
          <input
            type="number"
            min={0}
            className="input"
            value={osCount}
            onChange={(e) => setOsCount(Number(e.target.value))}
          />
        </Field>
        <Field label="OS率(自動計算・保存はしません)">
          <input
            className="input bg-slate-100"
            value={`${formatOsRate(osRate)}${hasOs ? " / OSあり" : " / OSなし"}`}
            readOnly
          />
        </Field>
      </div>

      <Field label="面談文字起こし" required>
        <textarea
          className="input h-64 font-mono text-sm"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="面談の文字起こしを貼り付けてください"
          required
        />
      </Field>

      {errorMessage && (
        <p className="text-red-600 text-sm">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-md disabled:opacity-50"
      >
        {submitting ? "登録中..." : "面談を登録する"}
      </button>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: 2px solid #2563eb;
          outline-offset: 1px;
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
