import InterviewForm from "@/components/interviews/InterviewForm";

export default function NewInterviewPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">面談データ登録</h1>
      <InterviewForm />
    </div>
  );
}
