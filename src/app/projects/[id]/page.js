"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ProjectDetail() {

  const searchParams = useSearchParams();

  const title = searchParams.get("title") || "名称未設定";
  const destination = searchParams.get("destination") || "目的地未定";
  const date = searchParams.get("date") || "日程未定";

  return (
    <div className="bg-gray-100 min-h-screen pb-24 relative">
      <h1 className="text-3xl font-bold p-4 ml-1">{title} 清算リスト</h1>
      <p className="text-gray-600 ml-5">目的地：{destination}</p>
      <p className="text-gray-600 ml-5 mb-2">期間：{date}</p>

      <div className="flex flex-col gap-2">
        <PaymentRow />
      </div>

      {/* 合計清算額 */}
      <div className="fixed bottom-0 w-full bg-white p-3">
        <p className="text-2xl">合計精算額: ¥15,000</p>
      </div>
    </div>
  );
}

function PaymentRow() {
  // 精算済みかどうかの状態を管理
  const [isSettled, setIsSettled] = useState(false);

  // テキスト用の仮データ
  const payer = "プログラミング太郎";
  const amount = 5000;

  return (
    <div className={`flex items-center justify-between p-4 border-2 border-grey-300 rounded-md ml-5 mr-5 mt-2 transition-colors ${isSettled ? 'bg-gray-50 opacity-60' : 'bg-white'
      }`}>

      {/*チェックボックス*/}
      <div className="flex-shrink-0 mr-4">
        <input
          type="checkbox"
          checked={isSettled}
          onChange={() => setIsSettled(!isSettled)}
          className="w-6 h-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
      </div>

      {/*支払者+メモ*/}
      <div className="flex-1 min-w-0 pr-4">
        <p className={`text-lg font-bold truncate ${isSettled ? 'text-gray-500 line-through' : 'text-gray-900'
          }`}>
          {payer}
        </p>
        <p>ゲーミングPC</p>
      </div>

      {/* 支払金額 */}
      <div className="flex-shrink-0 text-right">
        <p className={`text-xl font-bold ${isSettled ? 'text-gray-500' : 'text-blue-600'
          }`}>
          ¥{amount.toLocaleString()}
        </p>
      </div>

    </div>
  );
}

