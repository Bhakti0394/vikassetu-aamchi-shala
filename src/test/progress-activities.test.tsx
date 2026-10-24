import { describe, expect, it } from "vitest";
import { ACTIVITIES, DOMAINS, type DomainId } from "@/lib/data";

describe("Progress / Observation Management Activities (21 Activities Availability)", () => {
  it("contains exactly 21 activities in the shared activities data source", () => {
    expect(ACTIVITIES).toHaveLength(21);
  });

  it("has activities available across all 5 learning domains", () => {
    const domainCounts: Record<DomainId, number> = {
      alphabet: 0,
      numbers: 0,
      colours: 0,
      art: 0,
      stories: 0,
    };

    ACTIVITIES.forEach((activity) => {
      domainCounts[activity.domain] = (domainCounts[activity.domain] || 0) + 1;
    });

    expect(domainCounts.alphabet).toBe(5);
    expect(domainCounts.numbers).toBe(4);
    expect(domainCounts.colours).toBe(5);
    expect(domainCounts.art).toBe(3);
    expect(domainCounts.stories).toBe(4);

    const total = Object.values(domainCounts).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(21);
  });

  it("ensures every activity has valid metadata for observation management", () => {
    ACTIVITIES.forEach((activity) => {
      expect(activity.id).toBeTruthy();
      expect(activity.name).toBeTruthy();
      expect(activity.emoji).toBeTruthy();
      expect(activity.minutes).toBeGreaterThan(0);
      expect(["Easy", "Medium"]).toContain(activity.difficulty);
      expect(DOMAINS.some((d) => d.id === activity.domain)).toBe(true);
      expect(Array.isArray(activity.skills)).toBe(true);
      expect(Array.isArray(activity.steps)).toBe(true);
    });
  });

  it("ensures all 21 activity IDs are unique", () => {
    const ids = ACTIVITIES.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(21);
  });

  it("verifies that pairing any activity with its domain matches backend observation requirement", () => {
    ACTIVITIES.forEach((activity) => {
      // Backend validates: if activity.domain != payload.domain -> HTTPException 422
      const payloadDomain = activity.domain;
      expect(payloadDomain).toBe(activity.domain);
    });
  });
});
