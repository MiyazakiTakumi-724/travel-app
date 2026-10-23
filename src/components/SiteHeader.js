import Link from "next/link";

export default function SiteHeader({ logoHref, children }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        {logoHref ? (
          <Link href={logoHref} className="font-bold text-gray-900 hover:text-blue-600">
            旅行清算アプリ
          </Link>
        ) : (
          <span className="font-bold text-gray-900">旅行清算アプリ</span>
        )}
        {children}
      </div>
    </header>
  );
}
