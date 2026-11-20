import { describe, expect, it } from "vitest";
import {
  availableCount,
  fitsInRange,
  isValidDays,
  myScheduleTodo,
  schedulePhase,
  tallyAnswers,
  tripEndDate,
} from "./schedule";

const participants = [
  { id: "a", availableDays: ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"] },
  { id: "b", availableDays: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"] },
  { id: "c", availableDays: ["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"] },
];

describe("schedulePhase", () => {
  const project = { startDate: "", endDate: "", days: 3, rangeStart: "2026-11-01", rangeEnd: "2026-11-30", tentativeStart: null };
  const submitted = [{ availabilitySubmitted: true }, { availabilitySubmitted: true }];

  it("提出していない人がいるうちは collecting", () => {
    expect(schedulePhase(project, [{ availabilitySubmitted: true }, { availabilitySubmitted: false }])).toBe("collecting");
  });

  it("退会済みの人の提出は待たない", () => {
    expect(schedulePhase(project, [{ availabilitySubmitted: true }, { availabilitySubmitted: false, retired: true }])).toBe("choosing");
  });

  it("全員が提出したら choosing、仮決定したら voting、確定したら decided", () => {
    expect(schedulePhase(project, submitted)).toBe("choosing");
    expect(schedulePhase({ ...project, tentativeStart: "2026-11-14" }, submitted)).toBe("voting");
    expect(schedulePhase({ ...project, startDate: "2026-11-14", endDate: "2026-11-16" }, submitted)).toBe("decided");
  });

  it("日数や期間がないときは notStarted", () => {
    expect(schedulePhase({ ...project, days: null }, submitted)).toBe("notStarted");
    expect(schedulePhase({ ...project, rangeStart: null }, submitted)).toBe("notStarted");
  });
});

describe("tallyAnswers", () => {
  it("○・×・まだの人に分け、全員が ○ かを出す", () => {
    expect(
      tallyAnswers([
        { id: "a", tentativeAnswer: "yes" },
        { id: "b", tentativeAnswer: "no" },
        { id: "c", tentativeAnswer: null },
      ])
    ).toEqual({ yes: ["a"], no: ["b"], waiting: ["c"], allAgreed: false });

    expect(tallyAnswers([{ id: "a", tentativeAnswer: "yes" }, { id: "b", tentativeAnswer: "yes" }]).allAgreed).toBe(true);
    expect(tallyAnswers([]).allAgreed).toBe(false);
  });

  it("アカウントを削除して抜けた人（退会済み）の答えは待たない", () => {
    const result = tallyAnswers([
      { id: "a", tentativeAnswer: "yes" },
      { id: "b", tentativeAnswer: null, retired: true },
    ]);
    expect(result).toEqual({ yes: ["a"], no: [], waiting: [], allAgreed: true });
  });
});

describe("そのほか", () => {
  it("日数のチェック・終了日・期間に収まるか", () => {
    expect(isValidDays(1)).toBe(true);
    expect(isValidDays(14)).toBe(true);
    expect(isValidDays(0)).toBe(false);
    expect(isValidDays(15)).toBe(false);
    expect(tripEndDate("2026-11-30", 3)).toBe("2026-12-02");

    const range = { rangeStart: "2026-11-01", rangeEnd: "2026-11-30", days: 3 };
    expect(fitsInRange("2026-11-28", range)).toBe(true);
    expect(fitsInRange("2026-11-29", range)).toBe(false);
    expect(fitsInRange("2026-10-31", range)).toBe(false);
  });

  it("その日に行ける人数を、提出した人だけで数える", () => {
    const submitted = participants.map((p) => ({ ...p, availabilitySubmitted: true }));
    expect(availableCount("2026-11-03", submitted)).toBe(3);
    expect(availableCount("2026-11-06", submitted)).toBe(1);

    // c がまだ提出していなければ、選びかけの日は数えない
    const withDraft = submitted.map((p) => (p.id === "c" ? { ...p, availabilitySubmitted: false } : p));
    expect(availableCount("2026-11-03", withDraft)).toBe(2);
    expect(availableCount("2026-11-06", withDraft)).toBe(0);
  });
});

describe("myScheduleTodo", () => {
  const project = { startDate: "", endDate: "", days: 3, rangeStart: "2026-11-01", rangeEnd: "2026-11-30", tentativeStart: null };
  const people = (aSubmitted, bSubmitted, answers = {}) => [
    { id: "a", availabilitySubmitted: aSubmitted, tentativeAnswer: answers.a ?? null },
    { id: "b", availabilitySubmitted: bSubmitted, tentativeAnswer: answers.b ?? null },
  ];

  it("提出していない人には、提出を頼む", () => {
    expect(myScheduleTodo(project, people(false, true), "a", false)).toBe("行ける日を提出してください");
    expect(myScheduleTodo(project, people(true, false), "a", true)).toBeNull();
  });

  it("全員が提出したら、幹事にだけ仮決定を頼む", () => {
    expect(myScheduleTodo(project, people(true, true), "a", true)).toBe("日程を仮決定してください");
    expect(myScheduleTodo(project, people(true, true), "b", false)).toBeNull();
  });

  it("仮決定のあとは、まだ答えていない人に回答を頼む", () => {
    const voting = { ...project, tentativeStart: "2026-11-14" };
    expect(myScheduleTodo(voting, people(true, true, { a: "yes" }), "b", false)).toBe("仮決定の日程に回答してください");
    expect(myScheduleTodo(voting, people(true, true, { a: "yes" }), "a", true)).toBeNull();
  });

  it("日程が決まっていれば、やることはない", () => {
    expect(myScheduleTodo({ ...project, startDate: "2026-11-14", endDate: "2026-11-16" }, people(false, false), "a", true)).toBeNull();
  });
});
