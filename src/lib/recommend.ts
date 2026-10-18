import {
  ACTIVITIES,
  DOMAINS,
  domainOf,
  type Activity,
  type Child,
  type DomainId,
  type Observation,
  type Score,
} from "./data";

export type ActivityLogSummary = {
  childId: string;
  activityId: string;
  outcome: string;
  note?: string | undefined;
  createdAt?: string | undefined;
};

export type ChildAnalysis = {
  childId: string;
  observedDomains: DomainId[];
  latestScores: Partial<Record<DomainId, Score>>;
  confidence: Record<DomainId, "early" | "high">;
  evidence: Record<DomainId, string[]>;
  weakestDomains: { domain: DomainId; score: Score; isEarly: boolean }[];
  hasNoObservations: boolean;
};

export type Recommendation = {
  child: Child;
  domain: DomainId;
  activity: Activity;
  level: Score;
  reason: string;
  evidence: string[];
  isEarlySuggestion: boolean;
  secondaryActivity?: Activity | undefined;
  lastTrial?: { outcome: string; note?: string | undefined; date?: string | undefined } | undefined;
};

/**
 * Returns the unique list of domains in which the child has at least one recorded observation.
 */
export function observedDomainsOf(childId: string, observations: Observation[]): DomainId[] {
  const childObs = observations.filter((o) => o.childId === childId);
  const seen = new Set<DomainId>();
  const result: DomainId[] = [];

  for (const obs of childObs) {
    if (!seen.has(obs.domain)) {
      seen.add(obs.domain);
      result.push(obs.domain);
    }
  }

  return result;
}

/**
 * Checks whether an observation is considered a baseline or initial record.
 */
function isBaselineObservation(obs: Observation): boolean {
  const anyObs = obs as unknown as { isBaseline?: boolean; is_baseline?: boolean };
  return Boolean(
    anyObs.isBaseline ||
    anyObs.is_baseline ||
    obs.note?.trim().toLowerCase() === "baseline" ||
    obs.id.startsWith("base-"),
  );
}

/**
 * Analyses a child's classroom observation history across all learning domains.
 */
export function analyseChild(child: Child, observations: Observation[]): ChildAnalysis {
  const childObs = observations
    .filter((o) => o.childId === child.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const observedDomains = observedDomainsOf(child.id, observations);
  const latestScores: Partial<Record<DomainId, Score>> = {};
  const confidence: Record<DomainId, "early" | "high"> = {
    alphabet: "early",
    numbers: "early",
    colours: "early",
    art: "early",
    stories: "early",
  };
  const evidence: Record<DomainId, string[]> = {
    alphabet: [],
    numbers: [],
    colours: [],
    art: [],
    stories: [],
  };

  for (const d of DOMAINS) {
    const domainObs = childObs.filter((o) => o.domain === d.id);
    if (domainObs.length === 0) continue;

    const latest = domainObs[0];
    if (!latest) continue;
    latestScores[d.id] = latest.score;

    // Collect evidence notes
    for (const o of domainObs) {
      if (o.note && o.note.trim() && o.note.toLowerCase() !== "baseline") {
        evidence[d.id].push(o.note.trim());
      }
    }

    // High confidence if >= 2 observations and latest is not baseline
    if (domainObs.length >= 2 && !isBaselineObservation(latest)) {
      confidence[d.id] = "high";
    } else {
      confidence[d.id] = "early";
    }
  }

  // Derive weakest domains: level 1 prioritized over level 2; level 3 is mastered
  const weakestDomains: { domain: DomainId; score: Score; isEarly: boolean }[] = [];
  for (const d of DOMAINS) {
    const score = latestScores[d.id];
    if (score !== undefined && score < 3) {
      weakestDomains.push({
        domain: d.id,
        score,
        isEarly: confidence[d.id] === "early",
      });
    }
  }

  // Sort score 1 first, then score 2, preserving domain order for ties
  weakestDomains.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const idxA = DOMAINS.findIndex((d) => d.id === a.domain);
    const idxB = DOMAINS.findIndex((d) => d.id === b.domain);
    return idxA - idxB;
  });

  return {
    childId: child.id,
    observedDomains,
    latestScores,
    confidence,
    evidence,
    weakestDomains,
    hasNoObservations: observedDomains.length === 0,
  };
}

/**
 * Supportive pedagogical reason generator adhering to child-first, non-diagnostic guidelines.
 */
function buildPedagogicalReason(
  childName: string,
  domainId: DomainId,
  score: Score,
  activity: Activity,
  evidenceNotes: string[],
): string {
  const d = domainOf(domainId);
  const domainName = d ? d.name : domainId;
  const skillsText = activity.skills.slice(0, 2).join(" and ");

  let prefix = "";
  if (score === 1) {
    prefix = `${childName} is building foundational skills in ${domainName} (Level 1/3).`;
  } else {
    prefix = `${childName} is developing confidence in ${domainName} (Level 2/3).`;
  }

  let action = `${activity.name} offers playful, guided practice in ${skillsText}.`;
  if (evidenceNotes.length > 0) {
    action += ` Recent classroom observation noted: "${evidenceNotes[0]}".`;
  }

  return `${prefix} ${action}`;
}

/**
 * Rule-based recommendation engine for early preschool learners.
 *
 * Evaluates actual classroom observations, respects baselines, rotates
 * previously mastered activities, and generates supportive pedagogical rationales.
 */
export function recommendFor(
  child: Child,
  observations: Observation[],
  logs: ActivityLogSummary[] = [],
): Recommendation[] {
  const analysis = analyseChild(child, observations);

  // If a child has no observations, they are in "First observations pending"
  if (analysis.hasNoObservations || analysis.weakestDomains.length === 0) {
    return [];
  }

  const childLogs = logs.filter((l) => l.childId === child.id);
  const helpedActivityIds = new Set(
    childLogs.filter((l) => l.outcome === "tried_helped").map((l) => l.activityId),
  );

  const recommendations: Recommendation[] = [];

  for (const weak of analysis.weakestDomains.slice(0, 2)) {
    const domainId = weak.domain;
    const score = weak.score;

    // Filter candidate activities matching domain and level
    const candidates = ACTIVITIES.filter(
      (a) => a.domain === domainId && a.forLevel.includes(score),
    );

    if (candidates.length === 0) continue;

    // Activity Log Rotation & Difficulty Adjustment:
    // 1. Exclude or deprioritize activities already marked "tried_helped"
    const freshCandidates = candidates.filter((a) => !helpedActivityIds.has(a.id));
    const pool = freshCandidates.length > 0 ? freshCandidates : candidates;

    const childHadSupportNeed = childLogs.some(
      (l) =>
        l.outcome === "tried_needs_support" &&
        ACTIVITIES.find((act) => act.id === l.activityId)?.domain === domainId,
    );

    // 2. If child needed support in this domain, prefer "Easy" difficulty activity
    const sortedCandidates = [...pool].sort((a, b) => {
      if (childHadSupportNeed && a.difficulty !== b.difficulty) {
        return a.difficulty === "Easy" ? -1 : 1;
      }
      return 0;
    });

    const primaryActivity = sortedCandidates[0];
    if (!primaryActivity) continue;

    // Find a secondary suggestion if available
    const otherCandidates = pool.filter((a) => a.id !== primaryActivity.id);
    const secondaryActivity = otherCandidates.length > 0 ? otherCandidates[0] : undefined;

    // Find last trial info for primary activity if previously attempted
    const pastTrial = childLogs
      .filter((l) => l.activityId === primaryActivity.id)
      .sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )[0];

    const lastTrial = pastTrial
      ? {
          outcome: pastTrial.outcome,
          note: pastTrial.note ?? undefined,
          date: pastTrial.createdAt ?? undefined,
        }
      : undefined;

    const evidenceList = analysis.evidence[domainId] || [];
    const reason = buildPedagogicalReason(
      child.name,
      domainId,
      score,
      primaryActivity,
      evidenceList,
    );

    recommendations.push({
      child,
      domain: domainId,
      activity: primaryActivity,
      level: score,
      reason,
      evidence: evidenceList,
      isEarlySuggestion: weak.isEarly,
      secondaryActivity,
      lastTrial,
    });
  }

  return recommendations;
}
