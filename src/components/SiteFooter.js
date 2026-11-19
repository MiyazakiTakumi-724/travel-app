import Link from "next/link";

const links = [
  { href: "/guide", label: "使い方" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
];

export const REPOSITORY_URL = "https://github.com/MiyazakiTakumi-724/travel-app";

// 全ページ共通のフッター。使い方・利用規約・プライバシーポリシーとソースコードへのリンクを置く
export default function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-280 flex-col gap-3 border-t border-line-soft px-5 py-6 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <nav aria-label="このサイトについて">
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="inline-flex min-h-8 items-center font-medium transition-colors hover:text-primary">
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 items-center font-medium transition-colors hover:text-primary">
              ソースコード（GitHub）
            </a>
          </li>
        </ul>
      </nav>
      <p>© 2026 旅行清算アプリ（個人開発）</p>
    </footer>
  );
}
