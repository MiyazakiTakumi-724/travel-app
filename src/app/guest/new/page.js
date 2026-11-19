import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import GuestProjectForm from "./GuestProjectForm";

export const metadata = {
  title: "ゲストでプロジェクトを作成 | 旅行清算アプリ",
};

export default async function GuestNewProjectPage() {
  // Googleでログインしている人は、マイプロジェクトから作ってもらう
  if ((await auth())?.user?.id) redirect("/projects");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref="/">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm font-medium text-ink-muted transition-colors hover:text-primary">
          ← トップへ
        </Link>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-280 flex-1 justify-center px-5 pt-4 pb-16 sm:px-6 sm:pt-8">
        <GuestProjectForm />
      </main>
      <SiteFooter />
    </div>
  );
}
