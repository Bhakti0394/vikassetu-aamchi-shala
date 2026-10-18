export type PersonalizedPedagogy = {
  activityId: string;
  domain: string;
  title: string;
  reason: string;
  observedStrengths: string[];
  focusSkills: string[];
  teachingStrategy: string;
  teacherSteps: string[];
  successCriteria: string;
  nextStepIfSuccessful: string;
  nextStepIfSupportNeeded: string;
  evidence: string[];
  isAiGenerated: boolean;
};

export type PersonalizedRecommendationResponse = {
  childId: string;
  recommendations: PersonalizedPedagogy[];
  generatedAt: string;
  modelUsed?: string | undefined;
  fallback: boolean;
  fallbackReason?: string | undefined;
};

const API_BASE = "http://localhost:8000/api";

// Client-side cache keyed by childId + evidence fingerprint
const recommendationCache = new Map<string, { data: PersonalizedRecommendationResponse; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<PersonalizedRecommendationResponse | null>>();

const CACHE_STORAGE_KEY = "vikassetu_ai_rec_cache";

function getCachedRec(key: string): PersonalizedRecommendationResponse | null {
  const memory = recommendationCache.get(key);
  if (memory && Date.now() - memory.timestamp < 10 * 60 * 1000) {
    return memory.data;
  }
  if (typeof window !== "undefined" && typeof window.sessionStorage) {
    try {
      const raw = sessionStorage.getItem(`${CACHE_STORAGE_KEY}_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data && Date.now() - (parsed.timestamp || 0) < 10 * 60 * 1000) {
          recommendationCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {}
  }
  return null;
}

function setCachedRec(key: string, data: PersonalizedRecommendationResponse): void {
  const item = { data, timestamp: Date.now() };
  recommendationCache.set(key, item);
  if (typeof window !== "undefined" && typeof window.sessionStorage) {
    try {
      sessionStorage.setItem(`${CACHE_STORAGE_KEY}_${key}`, JSON.stringify(item));
    } catch {}
  }
}

// Sequential request queue to avoid flooding Groq LLM endpoint with parallel requests and triggering HTTP 429 rate limits
let requestQueue: Promise<unknown> = Promise.resolve();

function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  const result = requestQueue.then(() => fn());
  requestQueue = result.catch(() => {});
  return result;
}

/**
 * Invalidates cached recommendations for a specific child or all children.
 * Call this when a new observation or activity log is recorded.
 */
export function invalidateRecommendationCache(childId?: string): void {
  requestQueue = Promise.resolve();
  if (typeof window !== "undefined" && typeof window.sessionStorage) {
    try {
      if (childId) {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(`${CACHE_STORAGE_KEY}_${childId}:`)) {
            sessionStorage.removeItem(k);
          }
        }
      } else {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(CACHE_STORAGE_KEY)) {
            sessionStorage.removeItem(k);
          }
        }
      }
    } catch {}
  }
  if (childId) {
    for (const key of recommendationCache.keys()) {
      if (key.startsWith(`${childId}:`)) {
        recommendationCache.delete(key);
      }
    }
  } else {
    recommendationCache.clear();
  }
}

export function createEvidenceFingerprint(dates: string[], logCount: number): string {
  return `${[...dates].sort().join(",")}_logs:${logCount}`;
}

/**
 * Checks AI backend configuration status without exposing credentials.
 */
export async function checkAIStatus(): Promise<{ configured: boolean; model: string }> {
  try {
    const res = await fetch(`${API_BASE}/recommendations/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return { configured: false, model: "none" };
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      model: String(data.model || "none"),
    };
  } catch {
    return { configured: false, model: "none" };
  }
}

export type RecommendationContext = {
  child?: {
    id: string;
    name: string;
    age?: number | undefined;
    strengths?: string[] | undefined;
    needs?: string[] | undefined;
    scores?: Record<string, number> | undefined;
  } | undefined;
  observations?: {
    id?: string | undefined;
    childId?: string | undefined;
    domain: string;
    score?: number | null | undefined;
    note?: string | null | undefined;
    date?: string | undefined;
  }[] | undefined;
  recentTrials?: {
    activityId?: string | undefined;
    outcome: string;
    note?: string | undefined;
    completedSteps?: number | undefined;
    totalSteps?: number | undefined;
    createdAt?: string | undefined;
  }[] | undefined;
};

/**
 * Fetches personalized, evidence-driven AI recommendations for a child from FastAPI backend.
 * Uses client cache when evidence has not changed.
 * Deduplicates in-flight calls and never caches fallback responses long-term.
 */
export async function fetchPersonalizedRecommendations(
  childId: string,
  cacheKeyFingerprint?: string,
  context?: RecommendationContext,
): Promise<PersonalizedRecommendationResponse | null> {
  const cacheKey = `${childId}:${cacheKeyFingerprint || "default"}`;
  const cached = getCachedRec(cacheKey);

  // Return cached result if valid (within 10 minutes)
  if (cached) {
    return cached;
  }

  // Deduplicate in-flight requests for the same child and fingerprint
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const requestPromise = enqueueRequest(async (): Promise<PersonalizedRecommendationResponse | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const reqBody: Record<string, unknown> = {
        child_id: childId,
        limit_domains: 2,
      };

      if (context?.child) {
        reqBody["child_data"] = {
          id: context.child.id,
          name: context.child.name,
          age: context.child.age ?? 4,
          strengths: context.child.strengths ?? [],
          needs: context.child.needs ?? [],
          scores: context.child.scores ?? {},
        };
      }

      if (context?.observations && context.observations.length > 0) {
        reqBody["observations"] = context.observations.map((o) => ({
          id: o.id,
          child_id: o.childId,
          domain: o.domain,
          score: o.score,
          note: o.note,
          date: o.date,
        }));
      }

      if (context?.recentTrials && context.recentTrials.length > 0) {
        reqBody["recent_trials"] = context.recentTrials.map((t) => ({
          activity_id: t.activityId,
          outcome: t.outcome,
          note: t.note,
          completed_steps: t.completedSteps,
          total_steps: t.totalSteps,
          created_at: t.createdAt,
        }));
      }

      const res = await fetch(`${API_BASE}/recommendations/personalized`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return null;
      }

      const rawData = await res.json();

      const mappedRecs: PersonalizedPedagogy[] = (
        (rawData["recommendations"] as Record<string, unknown>[]) || []
      ).map((r: Record<string, unknown>) => ({
        activityId: String(r["activity_id"] || r["activityId"] || ""),
        domain: String(r["domain"] || ""),
        title: String(r["title"] || ""),
        reason: String(r["reason"] || ""),
        observedStrengths: Array.isArray(r["observed_strengths"] || r["observedStrengths"])
          ? ((r["observed_strengths"] || r["observedStrengths"]) as string[])
          : [],
        focusSkills: Array.isArray(r["focus_skills"] || r["focusSkills"])
          ? ((r["focus_skills"] || r["focusSkills"]) as string[])
          : [],
        teachingStrategy: String(r["teaching_strategy"] || r["teachingStrategy"] || ""),
        teacherSteps: Array.isArray(r["teacher_steps"] || r["teacherSteps"])
          ? ((r["teacher_steps"] || r["teacherSteps"]) as string[])
          : [],
        successCriteria: String(r["success_criteria"] || r["successCriteria"] || ""),
        nextStepIfSuccessful: String(r["next_step_if_successful"] || r["nextStepIfSuccessful"] || ""),
        nextStepIfSupportNeeded: String(
          r["next_step_if_support_needed"] || r["nextStepIfSupportNeeded"] || "",
        ),
        evidence: Array.isArray(r["evidence"]) ? (r["evidence"] as string[]) : [],
        isAiGenerated: Boolean(r["is_ai_generated"] ?? r["isAiGenerated"] ?? true),
      }));

      const result: PersonalizedRecommendationResponse = {
        childId: String(rawData["child_id"] || childId),
        recommendations: mappedRecs,
        generatedAt: String(rawData["generated_at"] || new Date().toISOString()),
        modelUsed: rawData["model_used"] ? String(rawData["model_used"]) : undefined,
        fallback: Boolean(rawData["fallback"]),
        fallbackReason: rawData["fallback_reason"] ? String(rawData["fallback_reason"]) : undefined,
      };

      // Only cache successful AI responses long-term. Never cache fallback indefinitely.
      if (!result.fallback && result.recommendations.length > 0) {
        setCachedRec(cacheKey, result);
      }

      return result;
    } catch {
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  });

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}
