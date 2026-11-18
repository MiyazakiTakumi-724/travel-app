import { fieldLabelClass, textFieldClass } from "./ui";
import { LIMITS } from "@/lib/limits";

// 新規作成・編集で共通のプロジェクト入力欄（name属性はServer Actionと対応）
export default function ProjectFormFields({ project }) {
  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabelClass}>タイトル</span>
        <input
          type="text"
          name="title"
          required
          maxLength={LIMITS.title}
          defaultValue={project?.title}
          placeholder="例：沖縄旅行"
          className={textFieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabelClass}>目的地</span>
        <input
          type="text"
          name="destination"
          maxLength={LIMITS.destination}
          defaultValue={project?.destination}
          placeholder="例：那覇"
          className={textFieldClass}
        />
      </label>

      <fieldset className="flex min-w-0 flex-col">
        <legend className={`${fieldLabelClass} mb-1.5`}>期間</legend>
        <div className="flex items-center gap-2">
          <input
            type="date"
            name="startDate"
            aria-label="開始日"
            defaultValue={project?.startDate}
            className={`${textFieldClass} flex-1 px-2.5 text-sm`}
          />
          <span aria-hidden="true" className="shrink-0 text-ink-muted">〜</span>
          <input
            type="date"
            name="endDate"
            aria-label="終了日"
            defaultValue={project?.endDate}
            className={`${textFieldClass} flex-1 px-2.5 text-sm`}
          />
        </div>
      </fieldset>
    </>
  );
}
