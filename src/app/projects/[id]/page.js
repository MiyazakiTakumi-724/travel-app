"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ProjectDetail() {

  // useState初期値設定
  const [isOpen, setisOpen] = useState(false);
  const [payer, setPayer] = useState("")
  const [memo, setMemo] = useState("")
  const [amount, setAmount] = useState("")
  const [paying, setPaying] = useState([])

  const searchParams = useSearchParams();

  const title = searchParams.get("title") || "名称未設定";
  const destination = searchParams.get("destination") || "目的地未定";
  const date = searchParams.get("date") || "日程未定";

  const AddPaying = () => {
    const newPaying = {
      id: Date.now(),
      payer: payer,
      memo: memo,
      amount: amount
    };

    setPaying([...paying, newPaying])

    setisOpen(false);
    setPayer("");
    setMemo("");
    setAmount("")
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-24 relative">
      <h1 className="text-6xl font-bold p-4 ml-1">{title} 清算リスト</h1>
      <p className="text-gray-600 ml-5 text-2xl">目的地：{destination}</p>
      <p className="text-gray-600 ml-5 text-2xl">期間：{date}</p>

      <div className="justify-end flex">
        <button
          onClick={() => setisOpen(!isOpen)}
          className="bg-blue-600 text-xl text-white px-6 py-4 mr-5 mb-3 rounded-md font-bold shadow-md hover:shadow-lg text-left transition transform hover:-translate-y-1 block">
          支払い入力
        </button>
      </div>

      {isOpen && (

        // オーバーレイ
        <>
          <div className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setisOpen(false)} />

          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-8 bg-white border-4 border-blue-200 rounded-xl shadow-lg w-full max-w-lg">

            <input

              // 支払い入力フォーム
              type="text"
              className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
              placeholder="支払者"
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
            />
            <input
              type="text"
              className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
              placeholder="支払い内容"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            <input
              type="number"
              className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
              placeholder="金額"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                onClick={AddPaying}
                className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold">
                確定する
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        {paying.map((payItem) => (
          <PaymentRow
            key={payItem.id}
            payer={payItem.payer}
            memo={payItem.memo}
            amount={payItem.amount}
          />
        ))}
      </div>

      {/* 合計清算額 */}
      <div className="fixed bottom-0 w-full bg-white p-3">
        <p className="text-2xl">合計精算額: ¥15,000</p>
      </div>
    </div>
  );
}

function PaymentRow({ payer, memo, amount }) {
  // 精算済みかどうかの状態を管理
  const [isSettled, setIsSettled] = useState(false);

  return (
    <div className={`flex items-center justify-between p-4 border-1 border-grey-300 rounded-md ml-5 mr-5 mt-2 transition-colors ${isSettled ? 'bg-gray-50 opacity-60' : 'bg-white'
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
        <p>{memo}</p>
      </div>

      {/* 支払金額 */}
      <div className="flex-shrink-0 text-right">
        <p className={`text-xl font-bold ${isSettled ? 'text-gray-500' : 'text-blue-600'
          }`}>
          ¥{Number(amount).toLocaleString()}
        </p>
      </div>

    </div>
  );
}

