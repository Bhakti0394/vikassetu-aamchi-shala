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
  scaffoldingNote?: string | undefined;
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
  priorActivityName?: string,
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
    action += priorActivityName
      ? ` Scaffolding adaptation: Following support needed in ${priorActivityName}, focusing on guided repetition with smaller steps and concrete materials.`
      : ` Focusing on guided repetition with smaller steps and concrete materials.`;
  } else if (lastTrialOutcome === "tried_helped") {
    action += ` Advancing learning to reinforce and extend demonstrated skills.`;
  } else if (isUnobserved) {
    action += ` Exploring foundational engagement as initial observations are gathered.`;
  }

  return `${prefix} ${action}`;
}

/**
 * Calculates a pedagogical suitability score for candidate activities.
 * Ranks activities according to developmental level, child age, observed needs,
 * classroom evidence, strengths, and past trial scaffolding.
 */
export function calculateActivitySuitability(
  activity: Activity,
  child: Child,
  score: Score,
  evidenceNotes: string[] = [],
  childLogs: ActivityLogSummary[] = [],
): number {
  let suitability = 0;

  // 1. Developmental level alignment
  if (activity.forLevel.includes(score)) {
    suitability += 35;
  } else {
    const minDiff = Math.min(...activity.forLevel.map((lvl) => Math.abs(score - lvl)));
    suitability -= minDiff * 20;
  }

  // 2. Age and difficulty/duration suitability
  const age = child.age ?? 4.0;
  if (age < 4.0) {
    if (activity.difficulty === "Easy") suitability += 15;
    if (activity.minutes <= 10) suitability += 10;
    else if (activity.minutes >= 20) suitability -= 10;
  } else if (age >= 5.0) {
    if (activity.difficulty === "Medium") suitability += 15;
    else if (activity.difficulty === "Easy" && score >= 2) suitability -= 5;
    if (activity.minutes >= 15) suitability += 10;
  } else {
    suitability += 5;
  }

  // 3. Needs & Evidence alignment
  const actText = `${activity.name} ${activity.skills.join(" ")} ${activity.steps.join(" ")}`.toLowerCase();

  for (const need of child.needs || []) {
    const needClean = need.trim().toLowerCase();
    if (!needClean) continue;
    const tokens = needClean.match(/[a-z0-9]+/g)?.filter((t) => t.length >= 4) || [];
    for (const token of tokens) {
      if (actText.includes(token)) suitability += 12;
    }
    // Specific pedagogical mappings
    if (
      (needClean.includes("beyond 5") || needClean.includes("1-10") || needClean.includes("counting")) &&
      (actText.includes("1-10") || actText.includes("count") || actText.includes("hopscotch") || actText.includes("number"))
    ) {
      suitability += 20;
    }
    if (
      (needClean.includes("movement") || needClean.includes("sitting") || needClean.includes("energy") || needClean.includes("active") || needClean.includes("focus")) &&
      (actText.includes("motor") || actText.includes("freeze") || actText.includes("dance") || actText.includes("jump") || actText.includes("walk") || actText.includes("balance"))
    ) {
      suitability += 20;
    }
    if (
      (needClean.includes("motor") || needClean.includes("pencil") || needClean.includes("grip") || needClean.includes("grasp")) &&
      (actText.includes("fine motor") || actText.includes("bridge") || actText.includes("clay") || actText.includes("bead") || actText.includes("pattern"))
    ) {
      suitability += 15;
    }
    if (
      (needClean.includes("rhythm") || needClean.includes("sound") || needClean.includes("pronun") || needClean.includes("syllable")) &&
      (actText.includes("rhythm") || actText.includes("clap") || actText.includes("sound") || actText.includes("syllable"))
    ) {
      suitability += 20;
    }
    if (
      (needClean.includes("story") || needClean.includes("narrative") || needClean.includes("express") || needClean.includes("vocab")) &&
      (actText.includes("story") || actText.includes("stones") || actText.includes("sequencing") || actText.includes("language"))
    ) {
      suitability += 15;
    }
  }

  for (const ev of evidenceNotes) {
    const evClean = ev.trim().toLowerCase();
    if (!evClean) continue;
    const tokens = evClean.match(/[a-z0-9]+/g)?.filter((t) => t.length >= 4) || [];
    for (const token of tokens) {
      if (actText.includes(token)) suitability += 8;
    }
  }

  for (const strn of child.strengths || []) {
    const strnClean = strn.trim().toLowerCase();
    if (!strnClean) continue;
    const tokens = strnClean.match(/[a-z0-9]+/g)?.filter((t) => t.length >= 4) || [];
    for (const token of tokens) {
      if (actText.includes(token)) suitability += 6;
    }
  }

  // 4. Scaffolding from prior trial outcomes
  const childHadSupportNeed = childLogs.some((l) => l.outcome === "tried_needs_support");
  if (childHadSupportNeed) {
    if (activity.difficulty === "Easy") suitability += 12;
    else if (activity.difficulty === "Medium") suitability -= 8;
  }

  // 5. Freshness bonus
  const trialCount = childLogs.filter(
    (l) => l.activityId === activity.id && (l.outcome === "tried_helped" || l.outcome === "tried_needs_support"),
  ).length;

  if (trialCount === 0) {
    suitability += 10;
  } else {
    suitability -= trialCount * 15;
  }

  return suitability;
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

  // Identify all completed activities for this child (both helped and needs-support trials)
  const completedActivityIds = new Set<string>(
    childLogs
      .filter((l) => l.outcome === "tried_helped" || l.outcome === "tried_needs_support")
      .map((l) => l.activityId)
      .filter(Boolean),
  );

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

  // 2. Add remaining assessed domains (e.g. score 3 extension or when fewer than 2 weak domains)
  if (analysis.observedDomains.length > 0) {
    for (const obsId of analysis.observedDomains) {
      if (!targetDomains.some((t) => t.domain === obsId)) {
        targetDomains.push({
          domain: obsId,
          score: (analysis.latestScores[obsId] ?? 3) as Score,
          isUnobserved: false,
          isEarly: analysis.confidence[obsId] === "early",
          hasExplicitScore: analysis.explicitScores[obsId] !== undefined,
        });
      }
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
  const chosenActivityIds = new Set<string>();

  for (const target of targetDomains) {
    if (recommendations.length >= 2) break;

    const domainId = target.domain;
    const score = target.score;

    // Filter candidate activities matching domain and level, excluding completed and already chosen
    let candidates = ACTIVITIES.filter(
      (a) =>
        a.domain === domainId &&
        a.forLevel.includes(score) &&
        !completedActivityIds.has(a.id) &&
        !chosenActivityIds.has(a.id),
    );

    // If no untried candidate matches the exact score in this domain, check other untried candidates in this domain
    if (candidates.length === 0) {
      candidates = ACTIVITIES.filter(
        (a) =>
          a.domain === domainId &&
          !completedActivityIds.has(a.id) &&
          !chosenActivityIds.has(a.id),
      );
    }

    // If all candidates in this domain are completed, check if all target domains are exhausted before allowing repetition
    if (candidates.length === 0) {
      continue;
    }

    const childHadSupportNeed = childLogs.some(
      (l) =>
        l.outcome === "tried_needs_support" &&
        ACTIVITIES.find((act) => act.id === l.activityId)?.domain === domainId,
    );

    const evidenceList = analysis.evidence[domainId] || [];

    // Sort candidates by pedagogical suitability
    const sortedCandidates = [...candidates].sort((a, b) => {
      const scoreA = calculateActivitySuitability(a, child, score, evidenceList, childLogs);
      const scoreB = calculateActivitySuitability(b, child, score, evidenceList, childLogs);
      return scoreB - scoreA;
    });

    const primaryActivity = sortedCandidates[0];
    if (!primaryActivity) continue;

    chosenActivityIds.add(primaryActivity.id);

    // Secondary suggestion if available from other domain candidates
    const otherDomainCandidates = ACTIVITIES.filter(
      (a) => a.domain === domainId && a.id !== primaryActivity.id && !chosenActivityIds.has(a.id),
    );
    const secondaryActivity = otherDomainCandidates.length > 0 ? otherDomainCandidates[0] : undefined;

    // Past trial info: check for primary activity first, or fallback to the domain's most recent trial
    const actPastTrial = childLogs
      .filter((l) => l.activityId === primaryActivity.id)
      .sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )[0];

    const domainPastTrial = childLogs
      .filter((l) => {
        const act = ACTIVITIES.find((a) => a.id === l.activityId);
        return act?.domain === domainId;
      })
      .sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )[0];

    const pastTrial = actPastTrial || domainPastTrial;

    const lastTrial = pastTrial
      ? {
          outcome: pastTrial.outcome,
          note: pastTrial.note ?? undefined,
          date: pastTrial.createdAt ?? undefined,
        }
      : undefined;

    const priorAct = pastTrial ? ACTIVITIES.find((a) => a.id === pastTrial.activityId) : undefined;
    const priorName = priorAct?.name;

    const scaffoldingNote =
      lastTrial?.outcome === "tried_needs_support"
        ? `Support Adaptation: Following support needed in ${priorName || "previous practice"}, introduce ${primaryActivity.name} with smaller micro-steps, physical manipulatives, and 1-on-1 modeling.`
        : undefined;

    const reason = buildPedagogicalReason(
      child.name,
      domainId,
      score,
      primaryActivity,
      evidenceList,
      lastTrial?.outcome,
      target.isUnobserved,
      target.hasExplicitScore,
      priorName,
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
      scaffoldingNote,
    });
  }

  // If all candidate target domains had 0 untried candidates (e.g. all activities completed),
  // allow an explicit repetition of a previously tried activity rather than returning an empty list
  if (recommendations.length === 0 && targetDomains.length > 0) {
    const firstTarget = targetDomains[0]!;
    const domainId = firstTarget.domain;
    const score = firstTarget.score;
    const domainActivities = ACTIVITIES.filter((a) => a.domain === domainId);

    if (domainActivities.length > 0) {
      // Pick activity with fewest trials
      const sorted = [...domainActivities].sort((a, b) => {
        const countA = childLogs.filter((l) => l.activityId === a.id).length;
        const countB = childLogs.filter((l) => l.activityId === b.id).length;
        return countA - countB;
      });

      const primaryActivity = sorted[0]!;
      const secondaryActivity = sorted[1];
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
        firstTarget.isUnobserved,
        firstTarget.hasExplicitScore,
      );

      recommendations.push({
        child,
        domain: domainId,
        activity: primaryActivity,
        level: score,
        reason,
        evidence: evidenceList,
        isEarlySuggestion: firstTarget.isEarly,
        hasExplicitScore: firstTarget.hasExplicitScore,
        secondaryActivity,
        lastTrial,
      });
    }
  }

  return recommendations;
}
