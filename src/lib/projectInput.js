import { daysBetween, isValidDate } from "./dates";
import { isWithinLength, LIMITS } from "./limits";
import { isValidDays, MAX_DAYS, MAX_RANGE_DAYS } from "./schedule";

// プロジェクトの作成・編集フォームの内容をチェックして、保存する値にする。
// 日程は「決まっている（開始日・終了日）」か「これから決める（日数と、行ける日を聞く期間）」のどちらか
export function parseProjectForm(formData) {
  const text = (name) => formData.get(name)?.toString().trim() ?? "";
  const title = text("title");
  const destination = text("destination");

  if (!title) return { error: "タイトルを入力してください" };
  if (!isWithinLength(title, LIMITS.title)) return { error: `タイトルは${LIMITS.title}文字以内で入力してください` };
  if (!isWithinLength(destination, LIMITS.destination)) {
    return { error: `目的地は${LIMITS.destination}文字以内で入力してください` };
  }

  if (text("dateMode") === "undecided") {
    const days = Number(text("days"));
    if (!isValidDays(days)) return { error: `旅行の日数は1〜${MAX_DAYS}日から選んでください` };

    const rangeStart = text("rangeStart");
    const rangeEnd = text("rangeEnd");
    if (!isValidDate(rangeStart) || !isValidDate(rangeEnd)) return { error: "日程を聞く期間を入力してください" };
    const span = daysBetween(rangeStart, rangeEnd) + 1;
    if (span < 1) return { error: "期間の終わりは始まりより後にしてください" };
    if (span > MAX_RANGE_DAYS) return { error: `期間は${MAX_RANGE_DAYS}日以内にしてください` };
    if (span < days) return { error: "期間が旅行の日数より短くなっています" };

    return { data: { title, destination, startDate: "", endDate: "", days, rangeStart, rangeEnd } };
  }

  const startDate = text("startDate");
  const endDate = text("endDate");
  if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
    return { error: "日付を確認してください" };
  }
  if (startDate && endDate && daysBetween(startDate, endDate) < 0) {
    return { error: "終了日は開始日より後にしてください" };
  }
  // 日程が決まっているときも、決め直すときのために日数を覚えておく
  const tripDays = startDate && endDate ? daysBetween(startDate, endDate) + 1 : null;
  return { data: { title, destination, startDate, endDate, days: isValidDays(tripDays) ? tripDays : null } };
}
