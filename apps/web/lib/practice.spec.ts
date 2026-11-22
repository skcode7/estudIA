import { describe, expect, it } from "vitest";

import { practiceLabel, practiceStatus } from "./practice";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-22T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

describe("practiceStatus", () => {
  it("is 'none' when the student has never completed a quiz", () => {
    expect(practiceStatus(null, NOW)).toEqual({ tone: "none", days: null });
  });

  it.each([
    [0, "fresh", 0],
    [4, "fresh", 4],
    [4.99, "fresh", 4],
    [5, "steady", 5],
    [15, "steady", 15],
    [15.5, "steady", 15],
    [16, "lapsed", 16],
    [40, "lapsed", 40]
  ])("after %s days is %s", (days, tone, expectedDays) => {
    expect(practiceStatus(daysAgo(days), NOW)).toEqual({ tone, days: expectedDays });
  });

  it("counts full 24h blocks, not calendar days", () => {
    const justBefore24h = new Date(NOW.getTime() - DAY_MS + 60_000).toISOString();
    expect(practiceStatus(justBefore24h, NOW)).toEqual({ tone: "fresh", days: 0 });
  });

  it("treats a completion date in the future as zero days", () => {
    const future = new Date(NOW.getTime() + DAY_MS).toISOString();
    expect(practiceStatus(future, NOW)).toEqual({ tone: "fresh", days: 0 });
  });
});

describe("practiceLabel", () => {
  it("explains a student who has never practised", () => {
    expect(practiceLabel({ tone: "none", days: null })).toBe("Aún no practicas");
  });

  it("uses the singular for one day", () => {
    expect(practiceLabel({ tone: "fresh", days: 1 })).toBe("1 día sin practicar");
  });

  it("uses the plural for several days", () => {
    expect(practiceLabel({ tone: "steady", days: 7 })).toBe("7 días sin practicar");
  });

  it("does not claim a day has passed when it is under 24 hours", () => {
    expect(practiceLabel({ tone: "fresh", days: 0 })).toBe("Practicaste hace menos de 1 día");
  });
});
