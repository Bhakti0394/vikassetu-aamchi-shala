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
      expect(recs[0]?.activity.id).toBe("free-drawing");
      expect(recs[0]?.lastTrial).toBeDefined();
      expect(recs[0]?.lastTrial?.outcome).toBe("tried_needs_support");
      expect(recs[0]?.lastTrial?.note).toBe("Needed help pressing leaves");
      expect(recs[0]?.secondaryActivity).toBeDefined();
      expect(recs[0]?.secondaryActivity?.id).toBe("leaf-painting");
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

    it("differentiates future recommendations between tried_helped, tried_needs_support, and not_tried", () => {
      const obs: Observation[] = [
        {
          id: "o-num",
          childId: "aarav",
          domain: "numbers",
          activityId: "count-match",
          score: 2,
          note: "Counts up to 5",
          date: "2026-10-18T10:00:00Z",
        },
      ];

      // 1. With tried_helped on count-match: should rotate to alternative (bead-counting)
      const helpedLogs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "count-match",
          outcome: "tried_helped",
          createdAt: "2026-10-17T10:00:00Z",
        },
      ];
      const recsAfterHelped = recommendFor(testChild, obs, helpedLogs);
      expect(recsAfterHelped[0]?.activity.id).toBe("bead-counting");

      // 2. With tried_needs_support on bead-counting: should prefer Easy count-match with scaffolding guidance
      const supportLogs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "bead-counting",
          outcome: "tried_needs_support",
          createdAt: "2026-10-17T10:00:00Z",
        },
      ];
      const recsAfterSupport = recommendFor(testChild, obs, supportLogs);
      expect(recsAfterSupport[0]?.activity.id).toBe("count-match");
      expect(recsAfterSupport[0]?.activity.difficulty).toBe("Easy");

      // 3. With not_tried: should not treat as failed, maintaining primary candidate
      const notTriedLogs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "count-match",
          outcome: "not_tried",
          createdAt: "2026-10-17T10:00:00Z",
        },
      ];
      const recsAfterNotTried = recommendFor(testChild, obs, notTriedLogs);
      expect(recsAfterNotTried[0]?.activity.id).toBe("count-match");
    });

    it("can recommend a previously tried activity again when all candidates have been tried", () => {
      const obs: Observation[] = [
        {
          id: "o-art",
          childId: "aarav",
          domain: "art",
          activityId: "leaf-painting",
          score: 2,
          note: "Enjoys art",
          date: "2026-10-18T10:00:00Z",
        },
      ];

      // Both art activities (leaf-painting and free-drawing) have been tried and helped
      const logs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "leaf-painting",
          outcome: "tried_helped",
          createdAt: "2026-10-15T10:00:00Z",
        },
        {
          childId: "aarav",
          activityId: "free-drawing",
          outcome: "tried_helped",
          createdAt: "2026-10-16T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, obs, logs);
      expect(recs.length).toBe(1);
      // Valid activity from catalog is still returned for continued practice
      expect(["leaf-painting", "free-drawing"]).toContain(recs[0]?.activity.id);
    });

    it("updates the evidence rationale when a new observation note is recorded", () => {
      const initialObs: Observation[] = [
        {
          id: "obs-init",
          childId: "aarav",
          domain: "alphabet",
          activityId: "letter-sounds",
          score: 1,
          note: "Recognised A and B but needed help with C, D and E.",
          date: "2026-10-15T10:00:00Z",
        },
      ];
      const recs1 = recommendFor(testChild, initialObs);
      expect(recs1[0]?.reason).toContain("Recognised A and B but needed help with C, D and E.");

      // Newer observation records updated progress
      const updatedObs: Observation[] = [
        {
          id: "obs-new",
          childId: "aarav",
          domain: "alphabet",
          activityId: "letter-sounds",
          score: 1,
          note: "Recognised A, B and C independently today.",
          date: "2026-10-18T10:00:00Z",
        },
        ...initialObs,
      ];
      const recs2 = recommendFor(testChild, updatedObs);
      expect(recs2[0]?.reason).toContain("Recognised A, B and C independently today.");
    });

    it("ensures every recommended activity ID belongs strictly to the existing catalog", () => {
      const allObservations: Observation[] = [
        { id: "1", childId: "aarav", domain: "alphabet", activityId: "letter-sounds", score: 1, note: "Letters", date: "2026-10-18T10:00:00Z" },
        { id: "2", childId: "aarav", domain: "numbers", activityId: "count-match", score: 1, note: "Numbers", date: "2026-10-18T10:00:00Z" },
        { id: "3", childId: "aarav", domain: "colours", activityId: "colour-hunt", score: 1, note: "Colours", date: "2026-10-18T10:00:00Z" },
        { id: "4", childId: "aarav", domain: "art", activityId: "leaf-painting", score: 1, note: "Art", date: "2026-10-18T10:00:00Z" },
        { id: "5", childId: "aarav", domain: "stories", activityId: "story-circle", score: 1, note: "Stories", date: "2026-10-18T10:00:00Z" },
      ];

      const validIds = new Set(["alphabet-match", "letter-sounds", "name-tracing", "count-match", "bead-counting", "colour-hunt", "shape-sort", "leaf-painting", "free-drawing", "story-circle", "handwash-song"]);

      const recs = recommendFor(testChild, allObservations);
      for (const r of recs) {
        expect(validIds.has(r.activity.id)).toBe(true);
      }
    });

    it("recommends evidence-based activity when observation is missing an explicit assessment score", () => {
      const obsNoScore: Observation = {
        id: "obs-no-score",
        childId: "new-student-42",
        domain: "art",
        activityId: "leaf-painting",
        score: undefined as unknown as 1,
        note: "Enjoyed mixing finger paints enthusiastically",
        date: "2026-10-18T10:00:00Z",
      };

      const customChild: Child = {
        id: "new-student-42",
        name: "Pooja",
        age: 4,
        avatar: "👧🏽",
        tone: "coral",
        scores: { alphabet: 1, numbers: 1, colours: 2, art: 2, stories: 1 },
        strengths: ["Loves colours"],
        needs: ["Fine motor skills"],
      };

      const analysis = analyseChild(customChild, [obsNoScore]);
      expect(analysis.hasNoObservations).toBe(false);
      expect(analysis.latestScores.art).toBe(2); // Falls back to child profile baseline
      expect(analysis.evidence.art).toContain("Enjoyed mixing finger paints enthusiastically");

      const recs = recommendFor(customChild, [obsNoScore]);
      expect(recs.length).toBe(1);
      expect(recs[0]?.domain).toBe("art");
      expect(recs[0]?.evidence).toContain("Enjoyed mixing finger paints enthusiastically");
    });

    it("recommends activity in observed domain when child only has 1 observed area with Level 3 (e.g. Yash)", () => {
      const yashChild: Child = {
        id: "yash",
        name: "Yash",
        age: 5,
        avatar: "👦🏽",
        tone: "teal",
        scores: { alphabet: 3, numbers: 2, colours: 3, art: 2, stories: 2 },
        strengths: ["Enthusiastic learner"],
        needs: ["Patience"],
      };

      const yashObs: Observation[] = [
        {
          id: "obs-yash-1",
          childId: "yash",
          domain: "alphabet",
          activityId: "letter-sounds",
          score: 3,
          note: "Mastered all letter phonics and blends",
          date: "2026-10-18T10:00:00Z",
        },
      ];

      const analysis = analyseChild(yashChild, yashObs);
      // Not all 5 domains are observed, so allAssessedMastered MUST be false
      expect(analysis.allAssessedMastered).toBe(false);
      expect(analysis.unobservedDomains.length).toBe(4);

      // recommendFor MUST NOT return empty []
      const recs = recommendFor(yashChild, yashObs);
      expect(recs.length).toBe(1);
      expect(recs[0]?.domain).toBe("alphabet");
      expect(recs[0]?.level).toBe(3);
      expect(recs[0]?.reason).toContain("offers creative extension and leadership practice");
      expect(recs[0]?.evidence).toContain("Mastered all letter phonics and blends");
    });

    it("marks allAssessedMastered TRUE only when all 5 domains are observed and verified at Level 3", () => {
      const fullChild: Child = {
        id: "saanvi",
        name: "Saanvi",
        age: 5,
        avatar: "👧🏽",
        tone: "sun",
        scores: { alphabet: 3, numbers: 3, colours: 3, art: 3, stories: 3 },
        strengths: ["All areas"],
        needs: [],
      };

      const fiveObs: Observation[] = [
        { id: "1", childId: "saanvi", domain: "alphabet", activityId: "letter-sounds", score: 3, note: "Mastered", date: "2026-10-18T10:00:00Z" },
        { id: "2", childId: "saanvi", domain: "numbers", activityId: "count-match", score: 3, note: "Mastered", date: "2026-10-18T10:00:00Z" },
        { id: "3", childId: "saanvi", domain: "colours", activityId: "colour-hunt", score: 3, note: "Mastered", date: "2026-10-18T10:00:00Z" },
        { id: "4", childId: "saanvi", domain: "art", activityId: "leaf-painting", score: 3, note: "Mastered", date: "2026-10-18T10:00:00Z" },
        { id: "5", childId: "saanvi", domain: "stories", activityId: "story-circle", score: 3, note: "Mastered", date: "2026-10-18T10:00:00Z" },
      ];

      const analysis = analyseChild(fullChild, fiveObs);
      expect(analysis.allAssessedMastered).toBe(true);
      expect(analysis.unobservedDomains.length).toBe(0);

      // Even when all 5 domains are Level 3, recommendFor provides extension activities!
      const recs = recommendFor(fullChild, fiveObs);
      expect(recs.length).toBe(2);
      expect(recs[0]?.level).toBe(3);
    });

    it("generates recommendations from activity trial history when child has 0 manual observations", () => {
      const newChild: Child = {
        id: "kabir-new",
        name: "Kabir",
        age: 4,
        avatar: "👦🏽",
        tone: "sky",
        scores: { alphabet: 1, numbers: 1, colours: 1, art: 1, stories: 1 },
        strengths: [],
        needs: [],
      };

      const trialLogs: ActivityLogSummary[] = [
        {
          childId: "kabir-new",
          activityId: "leaf-painting",
          outcome: "tried_needs_support",
          note: "Needed assistance with brush hold",
          createdAt: "2026-10-18T10:00:00Z",
        },
      ];

      const recs = recommendFor(newChild, [], trialLogs);
      expect(recs.length).toBe(1);
      expect(recs[0]?.domain).toBe("art");
      // Prioritizes easier activity or adapts strategy based on support need
      expect(recs[0]?.lastTrial?.outcome).toBe("tried_needs_support");
    });
  });

  describe("Recommendation Lifecycle & 2-Active Recommendations Guarantee", () => {
    const multiObs: Observation[] = [
      {
        id: "o1",
        childId: "aarav",
        domain: "alphabet",
        activityId: "alphabet-match",
        score: 1,
        note: "Needs letter help",
        date: "2026-10-18T10:00:00Z",
      },
      {
        id: "o2",
        childId: "aarav",
        domain: "numbers",
        activityId: "count-match",
        score: 1,
        note: "Needs counting help",
        date: "2026-10-18T10:00:00Z",
      },
    ];

    it("1. Initially provides exactly 2 distinct recommendations when >= 2 eligible activities exist", () => {
      const recs = recommendFor(testChild, multiObs, []);
      expect(recs.length).toBe(2);
      expect(recs[0]?.activity.id).toBeDefined();
      expect(recs[1]?.activity.id).toBeDefined();
      expect(recs[0]?.activity.id).not.toBe(recs[1]?.activity.id);
    });

    it("2. Immediately excludes an activity completed with tried_helped and refills the slot", () => {
      const initialRecs = recommendFor(testChild, multiObs, []);
      const completedActivityId = initialRecs[0]!.activity.id;

      const logs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: completedActivityId,
          outcome: "tried_helped",
          note: "Helped successfully",
          createdAt: "2026-10-19T10:00:00Z",
        },
      ];

      const updatedRecs = recommendFor(testChild, multiObs, logs);
      expect(updatedRecs.length).toBe(2);
      const updatedIds = updatedRecs.map((r) => r.activity.id);

      // Completed activity must disappear immediately
      expect(updatedIds).not.toContain(completedActivityId);
      // Both slots remain filled with distinct activities
      expect(new Set(updatedIds).size).toBe(2);
    });

    it("3. Immediately excludes an activity with tried_needs_support without treating it as fresh pending", () => {
      const initialRecs = recommendFor(testChild, multiObs, []);
      const completedActivityId = initialRecs[0]!.activity.id;

      const logs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: completedActivityId,
          outcome: "tried_needs_support",
          note: "Needs simpler steps next time",
          createdAt: "2026-10-19T10:00:00Z",
        },
      ];

      const updatedRecs = recommendFor(testChild, multiObs, logs);
      expect(updatedRecs.length).toBe(2);
      const updatedIds = updatedRecs.map((r) => r.activity.id);

      // Must be excluded from active pending recommendations
      expect(updatedIds).not.toContain(completedActivityId);
      expect(new Set(updatedIds).size).toBe(2);
    });

    it("4. Completing both initial recommendations produces 2 new distinct recommendations", () => {
      const initialRecs = recommendFor(testChild, multiObs, []);
      const id1 = initialRecs[0]!.activity.id;
      const id2 = initialRecs[1]!.activity.id;

      const logs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: id1,
          outcome: "tried_helped",
          createdAt: "2026-10-19T10:00:00Z",
        },
        {
          childId: "aarav",
          activityId: id2,
          outcome: "tried_needs_support",
          createdAt: "2026-10-19T10:30:00Z",
        },
      ];

      const updatedRecs = recommendFor(testChild, multiObs, logs);
      expect(updatedRecs.length).toBe(2);
      const updatedIds = updatedRecs.map((r) => r.activity.id);

      expect(updatedIds).not.toContain(id1);
      expect(updatedIds).not.toContain(id2);
      expect(new Set(updatedIds).size).toBe(2);
    });

    it("5. Opening an activity without saving a trial (or not_tried outcome) does NOT exclude it", () => {
      const initialRecs = recommendFor(testChild, multiObs, []);
      const firstActivityId = initialRecs[0]!.activity.id;

      const notTriedLogs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: firstActivityId,
          outcome: "not_tried",
          createdAt: "2026-10-19T10:00:00Z",
        },
      ];

      const updatedRecs = recommendFor(testChild, multiObs, notTriedLogs);
      const updatedIds = updatedRecs.map((r) => r.activity.id);
      // not_tried does NOT mark activity completed and does NOT exclude it
      expect(updatedIds).toContain(firstActivityId);
    });

    it("6. Never duplicates recommendations when fewer than 2 untried eligible activities exist", () => {
      // Art domain only has 2 activities: leaf-painting and free-drawing
      const singleDomainObs: Observation[] = [
        {
          id: "o-art",
          childId: "aarav",
          domain: "art",
          activityId: "leaf-painting",
          score: 1,
          note: "Art support",
          date: "2026-10-18T10:00:00Z",
        },
      ];

      // Try leaf-painting
      const logs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "leaf-painting",
          outcome: "tried_helped",
          createdAt: "2026-10-19T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, singleDomainObs, logs);
      // Only free-drawing remains eligible in observed domain
      expect(recs.length).toBe(1);
      expect(recs[0]?.activity.id).toBe("free-drawing");
      // Must NOT duplicate free-drawing to fill 2 slots
      const ids = recs.map((r) => r.activity.id);
      expect(new Set(ids).size).toBe(recs.length);
    });

    it("7. Isolates trial history strictly by childId to prevent profile leakage", () => {
      const anayaChild: Child = {
        id: "anaya",
        name: "Anaya",
        age: 4,
        avatar: "👧🏽",
        tone: "coral",
        scores: { alphabet: 1, numbers: 1, colours: 2, art: 2, stories: 2 },
        strengths: [],
        needs: [],
      };

      const anayaObs: Observation[] = [
        {
          id: "o-anaya",
          childId: "anaya",
          domain: "alphabet",
          activityId: "alphabet-match",
          score: 1,
          note: "Alphabet need",
          date: "2026-10-18T10:00:00Z",
        },
        {
          id: "o-anaya-2",
          childId: "anaya",
          domain: "numbers",
          activityId: "count-match",
          score: 1,
          note: "Numbers need",
          date: "2026-10-18T10:00:00Z",
        },
      ];

      // Aarav completed alphabet-match
      const mixedLogs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "alphabet-match",
          outcome: "tried_helped",
          createdAt: "2026-10-19T10:00:00Z",
        },
      ];

      // Aarav recommendations exclude alphabet-match
      const aaravRecs = recommendFor(testChild, multiObs, mixedLogs);
      expect(aaravRecs.map((r) => r.activity.id)).not.toContain("alphabet-match");

      // Anaya recommendations still allow alphabet-match because she hasn't completed it!
      const anayaRecs = recommendFor(anayaChild, anayaObs, mixedLogs);
      expect(anayaRecs.map((r) => r.activity.id)).toContain("alphabet-match");
    });

    it("8. Generates explicit scaffolding adaptation note and reason when prior trial needed support", () => {
      const supportLogs: ActivityLogSummary[] = [
        {
          childId: "aarav",
          activityId: "alphabet-match",
          outcome: "tried_needs_support",
          note: "Found letter cards confusing",
          createdAt: "2026-10-19T10:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, multiObs, supportLogs);
      expect(recs.length).toBeGreaterThan(0);
      const alphabetRec = recs.find((r) => r.domain === "alphabet");
      expect(alphabetRec).toBeDefined();
      expect(alphabetRec?.scaffoldingNote).toBeDefined();
      expect(alphabetRec?.scaffoldingNote).toContain("Support Adaptation");
      expect(alphabetRec?.scaffoldingNote).toContain("Alphabet Match");
      expect(alphabetRec?.reason).toContain("Scaffolding adaptation");
    });
  });
});

