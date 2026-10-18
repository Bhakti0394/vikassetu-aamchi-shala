import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  fetchPersonalizedRecommendations,
  invalidateRecommendationCache,
  checkAIStatus,
} from "./aiRecommendations";

describe("aiRecommendations (src/lib/aiRecommendations.ts)", () => {
  beforeEach(() => {
    invalidateRecommendationCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkAIStatus", () => {
    it("returns configured true and model when backend status endpoint succeeds", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          configured: true,
          model: "openai/gpt-oss-120b",
          engine: "Groq Hybrid Recommendation Engine",
        }),
      } as Response);

      const status = await checkAIStatus();
      expect(status.configured).toBe(true);
      expect(status.model).toBe("openai/gpt-oss-120b");
    });

    it("returns configured false when backend status call fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const status = await checkAIStatus();
      expect(status.configured).toBe(false);
      expect(status.model).toBe("none");
    });
  });

  describe("fetchPersonalizedRecommendations", () => {
    it("maps backend response and caches by childId + fingerprint", async () => {
      const mockBackendResponse = {
        child_id: "aarav",
        recommendations: [
          {
            activity_id: "letter-sounds",
            domain: "alphabet",
            title: "Letter Sound Song for Early Phonics",
            reason: "Targeted support for C, D, and E building on known A and B.",
            observed_strengths: ["Recognised A and B independently"],
            focus_skills: ["Phonics", "Listening"],
            teaching_strategy: "Use multisensory sound repetition.",
            teacher_steps: ["Step 1", "Step 2"],
            success_criteria: "Produces 3 of 5 sounds independently.",
            next_step_if_successful: "Introduce letter card matching.",
            next_step_if_support_needed: "Reduce to 2 letters with tactile tiles.",
            evidence: ["Recognised A and B but needed help with C, D and E."],
            is_ai_generated: true,
          },
        ],
        generated_at: "2026-10-18T16:00:00Z",
        model_used: "openai/gpt-oss-120b",
        fallback: false,
        fallback_reason: null,
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBackendResponse,
      } as Response);
      global.fetch = fetchMock;

      const res1 = await fetchPersonalizedRecommendations("aarav", "fingerprint-1");
      expect(res1).not.toBeNull();
      expect(res1?.childId).toBe("aarav");
      expect(res1?.recommendations).toHaveLength(1);

      const rec = res1?.recommendations[0];
      expect(rec?.activityId).toBe("letter-sounds");
      expect(rec?.observedStrengths).toContain("Recognised A and B independently");
      expect(rec?.teacherSteps).toEqual(["Step 1", "Step 2"]);
      expect(rec?.isAiGenerated).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call with same fingerprint should hit cache without calling fetch again
      const res2 = await fetchPersonalizedRecommendations("aarav", "fingerprint-1");
      expect(res2).toEqual(res1);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Invalidation clears cache and forces fresh call
      invalidateRecommendationCache("aarav");
      const res3 = await fetchPersonalizedRecommendations("aarav", "fingerprint-1");
      expect(res3).toEqual(res1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("returns null gracefully when backend returns non-ok status or throws", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: "Internal error" }),
      } as Response);

      const res = await fetchPersonalizedRecommendations("anaya", "fp");
      expect(res).toBeNull();
    });

    it("returns null gracefully on network timeout or fetch rejection", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

      const res = await fetchPersonalizedRecommendations("anaya", "fp");
      expect(res).toBeNull();
    });
  });
});
