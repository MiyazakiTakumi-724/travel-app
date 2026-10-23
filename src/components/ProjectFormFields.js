import { textFieldClass } from "./ui";

// 新規作成・編集で共通の旅行の入力欄（name属性はServer Actionと対応）
export default function ProjectFormFields({ project }) {
  const dateClass = `${textFieldClass} flex-1 px-2.5 text-sm`;

  return (
    <>
      <input
        type="text"
        name="title"
        required
        aria-label="タイトル"
        defaultValue={project?.title}
        placeholder="タイトル"
        className={`${textFieldClass} font-bold`}
      />
      <input
        type="text"
        name="destination"
        aria-label="目的地"
        defaultValue={project?.destination}
        placeholder="目的地"
        className={textFieldClass}
      />
      <div className="flex items-center gap-2">
        <input type="date" name="startDate" aria-label="開始日" defaultValue={project?.startDate} className={dateClass} />
        <span aria-hidden="true" className="shrink-0 text-gray-400">〜</span>
        <input type="date" name="endDate" aria-label="終了日" defaultValue={project?.endDate} className={dateClass} />
      </div>
    </>
  );
}
