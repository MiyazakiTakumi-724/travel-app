import { GoogleIcon } from "./icons";

// Google のブランドガイドラインのダークテーマ（#131314 の塗り・#8E918F の枠）に合わせたピル型ボタン。
// 横幅は置く場所に合わせる（親の幅いっぱい。横に並べるときは中身の幅）
export default function GoogleSignInButton({ action, label = "Googleでログイン" }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-full border border-[#8E918F] bg-[#131314] pr-7 pl-5 font-medium whitespace-nowrap text-[#E3E3E3] transition-colors hover:bg-[#2A2A2C] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
      >
        <GoogleIcon size={20} />
        {label}
      </button>
    </form>
  );
}
