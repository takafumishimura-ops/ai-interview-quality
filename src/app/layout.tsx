import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI面談品質分析システム",
  description: "CAの面談品質をAIで分析し、OS率向上要因を特定する",
};

const NAV_ITEMS = [
  { href: "/interviews", label: "面談一覧" },
  { href: "/interviews/new", label: "面談登録" },
  { href: "/advisers", label: "担当者比較" },
  { href: "/comparison", label: "成果比較" },
  { href: "/ai-comparison", label: "AI比較分析" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <Link href="/interviews" className="font-bold text-lg text-brand-700">
                AI面談品質分析
              </Link>
              <nav className="flex gap-4 text-sm">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-slate-600 hover:text-brand-600"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
