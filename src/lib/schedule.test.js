import { describe, expect, it } from "vitest";
import {
  availableCount,
  fitsInRange,
  isValidDays,
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

  it("その日に行ける人数を数える", () => {
    expect(availableCount("2026-11-03", participants)).toBe(3);
    expect(availableCount("2026-11-06", participants)).toBe(1);
  });
});
