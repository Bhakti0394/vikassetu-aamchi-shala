import { describe, expect, it } from "vitest";
import {
  ACTIVITIES,
  DOMAINS,
  type Activity,
  type Child,
  type DomainId,
  type Observation,
} from "./data";
import { recommendFor, type ActivityLogSummary } from "./recommend";

const NEW_ACTIVITY_IDS = [
  "number-hopscotch",
  "bridge-builders",
  "colour-mixing-lab",
  "shadow-detective",
  "shape-hunt-walk",
  "rhythm-name-clap",
  "story-stones",
  "nature-treasure-mandala",
  "seed-diary",
  "freeze-and-feel-dance",
];

const VALID_DOMAINS: DomainId[] = ["alphabet", "numbers", "colours", "art", "stories"];

describe("Activity Catalog & Verification (src/lib/activities.test.ts)", () => {
  it("contains exactly 21 activities in total", () => {
    expect(ACTIVITIES.length).toBe(21);
  });

  it("every new activity ID exists in the catalog", () => {
    const catalogIds = new Set(ACTIVITIES.map((a) => a.id));
    for (const id of NEW_ACTIVITY_IDS) {
      expect(catalogIds.has(id)).toBe(true);
    }
  });

  it("all activity IDs across the catalog are strictly unique", () => {
    const ids = ACTIVITIES.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ACTIVITIES.length);
  });

  it("every activity has a valid domain", () => {
    for (const a of ACTIVITIES) {
      expect(VALID_DOMAINS).toContain(a.domain);
    }
  });

  it("every activity has forLevel values restricted to 1, 2, or 3", () => {
    for (const a of ACTIVITIES) {
      expect(a.forLevel.length).toBeGreaterThan(0);
      for (const level of a.forLevel) {
        expect([1, 2, 3]).toContain(level);
      }
    }
  });

  it("every activity has 2 to 3 skills", () => {
    for (const a of ACTIVITIES) {
      expect(a.skills.length).toBeGreaterThanOrEqual(2);
      expect(a.skills.length).toBeLessThanOrEqual(3);
    }
  });

  it("every activity has 3 to 5 steps", () => {
    for (const a of ACTIVITIES) {
      expect(a.steps.length).toBeGreaterThanOrEqual(3);
      expect(a.steps.length).toBeLessThanOrEqual(5);
    }
  });

  it("every activity minutes duration is 10, 15, or 20", () => {
    for (const a of ACTIVITIES) {
      expect([10, 15, 20]).toContain(a.minutes);
    }
  });

  describe("Recommendation Engine with New Activities", () => {
    const testChild: Child = {
      id: "test-child-eval",
      name: "Tanya",
      age: 4,
      avatar: "👧🏽",
      tone: "coral",
      scores: { alphabet: 2, numbers: 1, colours: 1, art: 2, stories: 2 },
      strengths: [],
      needs: [],
    };

    it("suggests at least one new activity for a child whose latest score is 1 in numbers", () => {
      // Child has Level 1 in numbers
      const obs: Observation[] = [
        {
          id: "obs-num-1",
          childId: "test-child-eval",
          domain: "numbers",
          activityId: "count-match",
          score: 1,
          note: "Needs practice with 1-5",
          date: "2026-10-18T10:00:00Z",
        },
      ];

      // Mark the baseline count-match as completed
      const logs: ActivityLogSummary[] = [
        {
          childId: "test-child-eval",
          activityId: "count-match",
          outcome: "tried_helped",
          createdAt: "2026-10-18T11:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, obs, logs);
      expect(recs.length).toBeGreaterThanOrEqual(1);
      const numbersRec = recs.find((r) => r.domain === "numbers");
      expect(numbersRec).toBeDefined();
      // Should suggest the new activity 'number-hopscotch' (which targets [1, 2])
      expect(numbersRec?.activity.id).toBe("number-hopscotch");
    });

    it("suggests at least one new activity for a child whose latest score is 1 in colours", () => {
      // Child has Level 1 in colours
      const obs: Observation[] = [
        {
          id: "obs-col-1",
          childId: "test-child-eval",
          domain: "colours",
          activityId: "colour-hunt",
          score: 1,
          note: "Identifying red and blue",
          date: "2026-10-18T10:00:00Z",
        },
      ];

      // Mark the baseline colour-hunt as completed
      const logs: ActivityLogSummary[] = [
        {
          childId: "test-child-eval",
          activityId: "colour-hunt",
          outcome: "tried_helped",
          createdAt: "2026-10-18T11:00:00Z",
        },
      ];

      const recs = recommendFor(testChild, obs, logs);
      expect(recs.length).toBeGreaterThanOrEqual(1);
      const coloursRec = recs.find((r) => r.domain === "colours");
      expect(coloursRec).toBeDefined();
      // Should suggest the new activity 'colour-mixing-lab' or 'shape-hunt-walk' (which targets [1, 2])
      expect(["colour-mixing-lab", "shape-hunt-walk"]).toContain(coloursRec?.activity.id);
    });

    it("recommends Jump and Learn Numbers (number-hopscotch) when child benefits from movement and hopping while counting", () => {
      const anaya: Child = {
        id: "anaya-test",
        name: "Anaya",
        age: 4.5,
        avatar: "👧🏽",
        tone: "coral",
        scores: { alphabet: 2, numbers: 1, colours: 2, art: 2, stories: 2 },
        strengths: ["Loves outdoor play and jumping"],
        needs: ["Active movement while counting", "Hopping and balance"],
      };

      const obs: Observation[] = [
        {
          id: "obs-num-anaya",
          childId: "anaya-test",
          domain: "numbers",
          activityId: "count-match",
          score: 1,
          note: "Enjoys jumping games; learns numbers best through gross motor movement and hopping",
          date: "2026-10-19T10:00:00Z",
        },
      ];

      const recs = recommendFor(anaya, obs);
      expect(recs.length).toBeGreaterThanOrEqual(1);
      const numRec = recs.find((r) => r.domain === "numbers");
      expect(numRec).toBeDefined();
      expect(numRec?.activity.id).toBe("number-hopscotch");
    });

    it("recommends freeze-and-feel-dance when child needs sitting still / impulse regulation in stories", () => {
      const rohan: Child = {
        id: "rohan-test",
        name: "Rohan",
        age: 4.0,
        avatar: "👦🏽",
        tone: "sun",
        scores: { alphabet: 2, numbers: 2, colours: 2, art: 2, stories: 1 },
        strengths: ["High energy", "Loves outdoor play"],
        needs: ["Sitting still for stories", "Impulse control"],
      };

      const obs: Observation[] = [
        {
          id: "obs-rohan-stories",
          childId: "rohan-test",
          domain: "stories",
          activityId: "puppet-theatre",
          score: 1,
          note: "Very active; expresses feelings best when moving and dancing",
          date: "2026-10-19T10:00:00Z",
        },
      ];

      const recs = recommendFor(rohan, obs);
      expect(recs.length).toBeGreaterThanOrEqual(1);
      const storiesRec = recs.find((r) => r.domain === "stories");
      expect(storiesRec).toBeDefined();
      expect(storiesRec?.activity.id).toBe("freeze-and-feel-dance");
    });

    it("strictly excludes unsuitable activities when outside child's developmental level", () => {
      const tanyaLevel1: Child = {
        id: "tanya-level1",
        name: "Tanya",
        age: 3.5,
        avatar: "👧🏽",
        tone: "sun",
        scores: { alphabet: 2, numbers: 2, colours: 2, art: 1, stories: 2 },
        strengths: ["Enjoys finger exploration"],
        needs: ["Beginning fine motor exploration"],
      };

      const obs: Observation[] = [
        {
          id: "obs-tanya-art",
          childId: "tanya-level1",
          domain: "art",
          activityId: "free-drawing",
          score: 1,
          note: "Beginning to explore marks on paper",
          date: "2026-10-19T10:00:00Z",
        },
      ];

      const recs = recommendFor(tanyaLevel1, obs);
      const artRec = recs.find((r) => r.domain === "art");
      expect(artRec).toBeDefined();
      // bridge-builders is for levels [2, 3], so it must NOT be recommended for level 1
      expect(artRec?.activity.id).not.toBe("bridge-builders");
      expect([1, 2]).toContain(artRec?.activity.forLevel[0]);
    });

    it("recommends rhythm-name-clap when child needs syllable and rhythm practice in alphabet", () => {
      const samar: Child = {
        id: "samar-test",
        name: "Samar",
        age: 4.5,
        avatar: "👦🏽",
        tone: "teal",
        scores: { alphabet: 1, numbers: 2, colours: 2, art: 2, stories: 2 },
        strengths: ["Music and rhythm"],
        needs: ["Rhythm and syllables in names", "Speech clarity"],
      };

      const obs: Observation[] = [
        {
          id: "obs-samar-alpha",
          childId: "samar-test",
          domain: "alphabet",
          activityId: "alphabet-match",
          score: 1,
          note: "Enjoys rhythm games; clapping helps connect with letter sounds",
          date: "2026-10-19T10:00:00Z",
        },
      ];

      const recs = recommendFor(samar, obs);
      const alphaRec = recs.find((r) => r.domain === "alphabet");
      expect(alphaRec).toBeDefined();
      expect(alphaRec?.activity.id).toBe("rhythm-name-clap");
    });
  });
});
