import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/projects");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
      <div className="w-full max-w-sm flex flex-col items-center bg-white rounded-2xl shadow-md p-8">
        <p className="text-3xl font-bold text-gray-900 mb-2 text-center">
          旅行割り勘サイト
        </p>
        <p className="text-sm text-gray-500 mb-8 text-center">
          Googleアカウントでログインして、旅費の記録・清算を始めましょう
        </p>

        <form
          className="w-full"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/projects" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 px-6 py-4 rounded-full text-base font-bold shadow-sm active:bg-gray-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.4 0-13.8 4.2-17 10.3z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.3 0-9.8-3.1-11.3-7.5l-6.5 5C9.9 39.6 16.4 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.6-2.6 4.8-4.9 6.3l6.3 5.3C40.3 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
            </svg>
            Googleでログイン
          </button>
        </form>
      </div>
    </div>
  );
}