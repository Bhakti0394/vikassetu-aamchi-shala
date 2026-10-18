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
  completedSteps?: number | undefined;
  totalSteps?: number | undefined;
  note?: string | undefined;
  createdAt?: string | undefined;
};

export type ChildAnalysis = {
  childId: string;
  observedDomains: DomainId[];
  latestScores: Partial<Record<DomainId, Score>>;
  explicitScores: Partial<Record<DomainId, Score>>;
  confidence: Record<DomainId, "early" | "high">;
  evidence: Record<DomainId, string[]>;
  weakestDomains: { domain: DomainId; score: Score; isEarly: boolean; hasExplicitScore: boolean }[];
  hasNoObservations: boolean;
  unobservedDomains: DomainId[];
  allAssessedMastered: boolean;
};

export type Recommendation = {
  child: Child;
  domain: DomainId;
  activity: Activity;
  level: Score;
  reason: string;
  evidence: string[];
  isEarlySuggestion: boolean;
  hasExplicitScore?: boolean | undefined;
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
  const explicitScores: Partial<Record<DomainId, Score>> = {};
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

    // Rule: Do not discard an observation merely because an assessment score is missing.
    // Keep observed scores, child profile baseline scores, and unknown scores conceptually separate.
    const hasExplicitScore = latest.score !== undefined && latest.score !== null;
    if (hasExplicitScore) {
      explicitScores[d.id] = latest.score;
    }

    const resolvedScore: Score = hasExplicitScore ? latest.score : (child.scores[d.id] ?? 1);
    latestScores[d.id] = resolvedScore;

    // Collect evidence notes
    for (const o of domainObs) {
      if (o.note && o.note.trim() && o.note.toLowerCase() !== "baseline") {
        evidence[d.id].push(o.note.trim());
      }
    }

    // High confidence if >= 2 observations, explicit score present, and latest is not baseline
    if (domainObs.length >= 2 && hasExplicitScore && !isBaselineObservation(latest)) {
      confidence[d.id] = "high";
    } else {
      confidence[d.id] = "early";
    }
  }

  // Derive weakest domains: level 1 prioritized over level 2
  const weakestDomains: { domain: DomainId; score: Score; isEarly: boolean; hasExplicitScore: boolean }[] = [];
  for (const d of DOMAINS) {
    const score = latestScores[d.id];
    if (score !== undefined && score < 3) {
      weakestDomains.push({
        domain: d.id,
        score,
        isEarly: confidence[d.id] === "early",
        hasExplicitScore: explicitScores[d.id] !== undefined,
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

  const unobservedDomains = DOMAINS.map((d) => d.id).filter((d) => !observedDomains.includes(d));
  // Rule: A child has only mastered all assessed areas if ALL 5 domains have been observed with explicit verified scores of 3.
  const allAssessedMastered =
    observedDomains.length === DOMAINS.length &&
    DOMAINS.every((d) => (explicitScores[d.id] ?? 0) === 3);

  return {
    childId: child.id,
    observedDomains,
    latestScores,
    explicitScores,
    confidence,
    evidence,
    weakestDomains,
    hasNoObservations: observedDomains.length === 0,
    unobservedDomains,
    allAssessedMastered,
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
  lastTrialOutcome?: string,
  isUnobserved = false,
  hasExplicitScore = true,
): string {
  const d = domainOf(domainId);
  const domainName = d ? d.name : domainId;
  const skillsText = activity.skills.slice(0, 2).join(" and ");

  let prefix = "";
  if (isUnobserved) {
    prefix = `${childName} is exploring foundational learning in ${domainName} (Level ${score}/3).`;
  } else if (!hasExplicitScore) {
    prefix = `${childName} is engaging in ${domainName} (contextual baseline Level ${score}/3).`;
  } else if (score === 1) {
    prefix = `${childName} is building foundational skills in ${domainName} (Level 1/3).`;
  } else if (score === 2) {
    prefix = `${childName} is developing confidence in ${domainName} (Level 2/3).`;
  } else {
    prefix = `${childName} has demonstrated mastery in ${domainName} (Level 3/3).`;
  }

  let action =
    score === 3
      ? `${activity.name} offers creative extension and leadership practice in ${skillsText}.`
      : `${activity.name} offers playful, guided practice in ${skillsText}.`;

  if (evidenceNotes.length > 0) {
    action += ` Recent classroom observation noted: "${evidenceNotes[0]}".`;
  }

  if (lastTrialOutcome === "tried_needs_support") {
    action += ` Focusing on guided repetition with smaller steps and concrete materials.`;
  } else if (lastTrialOutcome === "tried_helped") {
    action += ` Advancing learning to reinforce and extend demonstrated skills.`;
  } else if (isUnobserved) {
    action += ` Exploring foundational engagement as initial observations are gathered.`;
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
  const childLogs = logs.filter((l) => l.childId === child.id);
  const analysis = analyseChild(child, observations);

  // If a child has genuinely no observations AND no activity trials, first observations apply
  if (analysis.hasNoObservations && childLogs.length === 0) {
    return [];
  }

  // 1. Weakest assessed domains (score 1 or 2)
  const targetDomains: {
    domain: DomainId;
    score: Score;
    isUnobserved: boolean;
    isEarly: boolean;
    hasExplicitScore: boolean;
  }[] = analysis.weakestDomains.map((w) => ({
    domain: w.domain,
    score: w.score,
    isUnobserved: false,
    isEarly: w.isEarly,
    hasExplicitScore: w.hasExplicitScore,
  }));

  // 2. If all assessed domains are score 3 (e.g. Yash with Level 3, or child with all 5 at Level 3):
  // Provide Level 3 extension and leadership activities in observed domains
  if (targetDomains.length === 0 && analysis.observedDomains.length > 0) {
    for (const obsId of analysis.observedDomains) {
      if (targetDomains.length >= 2) break;
      targetDomains.push({
        domain: obsId,
        score: 3,
        isUnobserved: false,
        isEarly: analysis.confidence[obsId] === "early",
        hasExplicitScore: analysis.explicitScores[obsId] !== undefined,
      });
    }
  }

  // 3. If child has no observations, but has prior activity trial history:
  if (targetDomains.length === 0 && analysis.hasNoObservations && childLogs.length > 0) {
    const lastLog = [...childLogs].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )[0];
    const act = lastLog ? ACTIVITIES.find((a) => a.id === lastLog.activityId) : undefined;
    if (act && lastLog) {
      const trialScore: Score = lastLog.outcome === "tried_helped" ? 2 : 1;
      targetDomains.push({
        domain: act.domain,
        score: trialScore,
        isUnobserved: false,
        isEarly: true,
        hasExplicitScore: false,
      });
    }
  }

  const recommendations: Recommendation[] = [];

  for (const target of targetDomains.slice(0, 2)) {
    const domainId = target.domain;
    const score = target.score;

    // Filter candidate activities matching domain and level
    const candidates = ACTIVITIES.filter(
      (a) => a.domain === domainId && a.forLevel.includes(score),
    );

    if (candidates.length === 0) continue;

    const childHadSupportNeed = childLogs.some(
      (l) =>
        l.outcome === "tried_needs_support" &&
        ACTIVITIES.find((act) => act.id === l.activityId)?.domain === domainId,
    );

    // Compute activity trial history stats for smart rotation
    const candidateStats = candidates.map((cand) => {
      const candLogs = childLogs.filter((l) => l.activityId === cand.id);
      const lastTrial = candLogs.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )[0];
      const helped = candLogs.some((l) => l.outcome === "tried_helped");
      const needsSupport = lastTrial?.outcome === "tried_needs_support";
      return {
        cand,
        lastTrial,
        helped,
        needsSupport,
        trialCount: candLogs.length,
      };
    });

    // Smart Rotation & Pedagogical Difficulty Priority:
    // 1. Separate candidates that have already helped from unmastered candidates
    const unmastered = candidateStats.filter((s) => !s.helped);
    const pool = unmastered.length > 0 ? unmastered : candidateStats;

    // 2. Sort pool:
    // - If child had support needs in domain, prioritize "Easy" difficulty over "Medium"
    // - Unmastered candidates take precedence over already-helped activities
    const sortedStats = [...pool].sort((a, b) => {
      if (childHadSupportNeed && a.cand.difficulty !== b.cand.difficulty) {
        return a.cand.difficulty === "Easy" ? -1 : 1;
      }
      return 0;
    });

    const primaryStat = sortedStats[0];
    if (!primaryStat) continue;
    const primaryActivity = primaryStat.cand;

    // Find a secondary suggestion if available from the remaining pool
    const otherCandidates = pool.filter((s) => s.cand.id !== primaryActivity.id).map((s) => s.cand);
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
      lastTrial?.outcome,
      target.isUnobserved,
      target.hasExplicitScore,
    );

    recommendations.push({
      child,
      domain: domainId,
      activity: primaryActivity,
      level: score,
      reason,
      evidence: evidenceList,
      isEarlySuggestion: target.isEarly,
      hasExplicitScore: target.hasExplicitScore,
      secondaryActivity,
      lastTrial,
    });
  }

  return recommendations;
}
