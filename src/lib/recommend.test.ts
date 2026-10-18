import { describe, expect, it } from "vitest";
import {
  analyseChild,
  observedDomainsOf,
  recommendFor,
  type ActivityLogSummary,
} from "./recommend";
import type { Child, Observation } from "./data";

const testChild: Child = {
  id: "aarav",
  name: "Aarav",
  age: 4,
  avatar: "👦🏽",
  tone: "teal",
  scores: { alphabet: 1, numbers: 2, colours: 3, art: 2, stories: 2 },
  strengths: ["Recognises basic colours"],
  needs: ["Alphabet recognition"],
};

describe("Recommendation Engine (src/lib/recommend.ts)", () => {
  describe("observedDomainsOf", () => {
    it("extracts unique domains where child has observations", () => {
      const observations: Observation[] = [
        {
          id: "o1",
          childId: "aarav",
          domain: "alphabet",
          activityId: "alphabet-match",
          score: 1,
          note: "Needs help with B and D",
          date: "2026-10-15T10:00:00Z",
        },
        {
          id: "o2",
          childId: "aarav",
          domain: "alphabet",
          activityId: "sound-safari",
          score: 2,
          note: "Better today",
          date: "2026-10-16T10:00:00Z",
        },
        {
          id: "o3",
          childId: "aarav",
          domain: "numbers",
          activityId: "bead-counting",
          score: 2,
          note: "Counts to 5",
          date: "2026-10-17T10:00:00Z",
        },
        {
          id: "o4",
          childId: "other-child",
          domain: "colours",
          activityId: "colour-sort",
          score: 3,
          note: "Great",
          date: "2026-10-17T10:00:00Z",
        },
      ];

      const domains = observedDomainsOf("aarav", observations);
      expect(domains).toEqual(["alphabet", "numbers"]);
    });

    it("returns empty array for child with zero observations", () => {
      expect(observedDomainsOf("new-child", [])).toEqual([]);
    });
  });

  describe("analyseChild", () => {
    it("derives latest score and evidence from newest observation per domain", () => {
      const observations: Observation[] = [
        {
          id: "o1",
          childId: "aarav",
          domain: "alphabet",
          activityId: "alphabet-match",
          score: 1,
          note: "Struggled with letter sounds",
          date: "2026-10-10T10:00:00Z",
        },
        {
          id: "o2",
          childId: "aarav",
          domain: "alphabet",
          activityId: "sound-safari",
          score: 2,
          note: "Practiced phonic sounds nicely",
          date: "2026-10-15T10:00:00Z",
        },
      ];

      const analysis = analyseChild(testChild, observations);
      expect(analysis.latestScores.alphabet).toBe(2);
      expect(analysis.confidence.alphabet).toBe("high");
      expect(analysis.evidence.alphabet).toContain("Practiced phonic sounds nicely");
      expect(analysis.hasNoObservations).toBe(false);
    });

    it("flags baseline observation as early confidence", () => {
      const baselineObs: Observation = {
        id: "base-1",
        childId: "aarav",
        domain: "numbers",
        activityId: "bead-counting",
        score: 1,
        note: "Baseline",
        date: "2026-10-01T10:00:00Z",
      };

      const analysis = analyseChild(testChild, [baselineObs]);
      expect(analysis.latestScores.numbers).toBe(1);
      expect(analysis.confidence.numbers).toBe("early");
      expect(analysis.weakestDomains[0]).toBeDefined();
      expect(analysis.weakestDomains[0]?.isEarly).toBe(true);
    });

    it("identifies unobserved child as having no observations", () => {
      const analysis = analyseChild(testChild, []);
      expect(analysis.hasNoObservations).toBe(true);
      expect(analysis.weakestDomains).toEqual([]);
    });
  });

  describe("recommendFor", () => {
    it("prioritizes score 1 (Needs Support) over score 2 (Developing)", () => {
      const observations: Observation[] = [
        {
          id: "o1",
          childId: "aarav",
          domain: "numbers",
          activityId: "bead-counting",
          score: 1,
          note: "Needs support counting 1 to 5",
          date: "2026-10-16T10:00:00Z",
        },
        {
          id: "o2",
          childId: "aarav",
          domain: "alphabet",
          activityId: "alphabet-match",
          score: 2,
          note: "Developing letter recognition",
          date: "2026-10-16T10:00:00Z",
        },
        {
          id: "o3",
          childId: "aarav",
          domain: "colours",
          activityId: "colour-sort",
          score: 3,
          note: "Mastered basic colours",
          date: "2026-10-16T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, observations);

      expect(recs.length).toBe(2);
      // First recommendation must be the score 1 domain (numbers)
      expect(recs[0]).toBeDefined();
      expect(recs[0]?.domain).toBe("numbers");
      expect(recs[0]?.level).toBe(1);
      // Second recommendation must be score 2 (alphabet)
      expect(recs[1]).toBeDefined();
      expect(recs[1]?.domain).toBe("alphabet");
      expect(recs[1]?.level).toBe(2);
      // Score 3 (colours) is excluded from remedial recommendations
      expect(recs.find((r) => r.domain === "colours")).toBeUndefined();
    });

    it("rotates away from activities previously logged with tried_helped", () => {
      const observations: Observation[] = [
        {
          id: "o1",
          childId: "aarav",
          domain: "numbers",
          activityId: "bead-counting",
          score: 2,
          note: "Counting with beads",
          date: "2026-10-16T10:00:00Z",
        },
      ];

      // Aarav previously did bead-counting and it helped
      const logs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "bead-counting",
          outcome: "tried_helped",
          note: "Mastered bead counting",
          createdAt: "2026-10-15T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, observations, logs);
      expect(recs.length).toBeGreaterThan(0);
      // The primary activity should not be bead-counting if another activity exists in numbers
      expect(recs[0]).toBeDefined();
      expect(recs[0]?.activity.id).not.toBe("bead-counting");
    });

    it("adheres strictly to supportive, non-diagnostic language guidelines", () => {
      const observations: Observation[] = [
        {
          id: "o1",
          childId: "aarav",
          domain: "alphabet",
          activityId: "alphabet-match",
          score: 1,
          note: "Hesitates with letters",
          date: "2026-10-16T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, observations);
      expect(recs[0]).toBeDefined();
      const reason = (recs[0]?.reason ?? "").toLowerCase();

      // Prohibited negative / diagnostic terms
      const forbiddenWords = ["slow", "failing", "weak", "delayed", "deficient", "poor", "behind"];
      for (const word of forbiddenWords) {
        expect(reason).not.toContain(word);
      }

      // Expected growth mindset framing
      expect(reason).toContain("aarav is building foundational skills in alphabet");
    });

    it("returns empty recommendations for children with no observations", () => {
      const recs = recommendFor(testChild, []);
      expect(recs).toEqual([]);
    });

    it("populates secondaryActivity and lastTrial information when available", () => {
      const observations: Observation[] = [
        {
          id: "o1",
          childId: "aarav",
          domain: "art",
          activityId: "leaf-painting",
          score: 2,
          note: "Enjoys painting",
          date: "2026-10-16T10:00:00Z",
        },
      ];

      const logs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "leaf-painting",
          outcome: "tried_needs_support",
          note: "Needed help pressing leaves",
          createdAt: "2026-10-14T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, observations, logs);
      expect(recs.length).toBe(1);
      expect(recs[0]?.lastTrial).toBeDefined();
      expect(recs[0]?.lastTrial?.outcome).toBe("tried_needs_support");
      expect(recs[0]?.lastTrial?.note).toBe("Needed help pressing leaves");
      expect(recs[0]?.secondaryActivity).toBeDefined();
      expect(recs[0]?.secondaryActivity?.id).toBe("free-drawing");
    });

    it("prefers an easier activity when tried_needs_support was logged", () => {
      // In numbers domain for Level 2, count-match is Easy and bead-counting is Medium
      const observations: Observation[] = [
        {
          id: "o1",
          childId: "aarav",
          domain: "numbers",
          activityId: "bead-counting",
          score: 2,
          note: "Counting with beads",
          date: "2026-10-16T10:00:00Z",
        },
      ];

      const logs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "bead-counting",
          outcome: "tried_needs_support",
          note: "Found 10 beads too difficult",
          createdAt: "2026-10-15T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, observations, logs);
      expect(recs.length).toBe(1);
      // count-match (Easy) should be preferred over bead-counting (Medium)
      expect(recs[0]?.activity.id).toBe("count-match");
      expect(recs[0]?.activity.difficulty).toBe("Easy");
    });

    it("does not change activity selection when outcome is not_tried", () => {
      const observations: Observation[] = [
        {
          id: "o1",
          childId: "aarav",
          domain: "numbers",
          activityId: "count-match",
          score: 2,
          note: "Counting pebbles",
          date: "2026-10-16T10:00:00Z",
        },
      ];

      const recsWithoutLogs = recommendFor(testChild, observations, []);

      const logs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "count-match",
          outcome: "not_tried",
          createdAt: "2026-10-15T10:00:00Z",
        },
      ];

      const recsWithNotTried = recommendFor(testChild, observations, logs);
      expect(recsWithNotTried[0]?.activity.id).toBe(recsWithoutLogs[0]?.activity.id);
    });

    it("never recommends unobserved learning areas", () => {
      // Child only observed in art
      const observations: Observation[] = [
        {
          id: "o1",
          childId: "aarav",
          domain: "art",
          activityId: "free-drawing",
          score: 1,
          note: "Needs encouragement with crayons",
          date: "2026-10-16T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, observations);
      expect(recs.length).toBe(1);
      expect(recs[0]?.domain).toBe("art");
      // Other domains must NOT be recommended
      const recommendedDomains = recs.map((r) => r.domain);
      expect(recommendedDomains).not.toContain("alphabet");
      expect(recommendedDomains).not.toContain("numbers");
      expect(recommendedDomains).not.toContain("colours");
      expect(recommendedDomains).not.toContain("stories");
    });

    it("excludes baseline notes from classroom evidence and marks confidence as early", () => {
      const observations: Observation[] = [
        {
          id: "base-1",
          childId: "aarav",
          domain: "colours",
          activityId: "colour-hunt",
          score: 2,
          note: "Baseline",
          date: "2026-10-01T10:00:00Z",
        },
      ];

      const analysis = analyseChild(testChild, observations);
      expect(analysis.confidence.colours).toBe("early");
      expect(analysis.evidence.colours).toEqual([]);

      const recs = recommendFor(testChild, observations);
      expect(recs[0]?.isEarlySuggestion).toBe(true);
      expect(recs[0]?.evidence).toEqual([]);
    });

    it("produces an early suggestion from a single real observation", () => {
      const observations: Observation[] = [
        {
          id: "obs-1",
          childId: "aarav",
          domain: "alphabet",
          activityId: "letter-sounds",
          score: 1,
          note: "Sang phonics song enthusiastically",
          date: "2026-10-16T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, observations);
      expect(recs[0]?.isEarlySuggestion).toBe(true);
      expect(recs[0]?.evidence).toContain("Sang phonics song enthusiastically");
    });
  });
});
