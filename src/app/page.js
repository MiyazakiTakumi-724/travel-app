"use client";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-10 bg-gray-100">
      <p className="absolute top-20 font-bold text-8xl">
        旅行割り勘サイト
      </p>
      <button className="bg-blue-950 text-white px-12 py-8 rounded-full text-5xl font-bold">
        ログイン
      </button>
    </div>
  );
}