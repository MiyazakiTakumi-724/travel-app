// 招待画面に出す旅行の内容。似た名前の旅行があっても見分けられるよう、目的地・日程・幹事・人数を並べる
export default function InviteSummary({ details }) {
  const rows = [
    ["目的地", details.destination || "未定"],
    ["日程", details.period],
    ["幹事", details.organizers || "—"],
    ["メンバー", `${details.memberCount}人が参加中`],
  ];
  return (
    <dl className="mt-3.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-bold text-ink-muted">{label}</dt>
          <dd className="min-w-0 wrap-break-word text-ink-sub">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
