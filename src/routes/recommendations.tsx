import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Eye,
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Check,
  Lightbulb,
  TrendingUp,
  Bot,
  HelpCircle,
  Compass,
} from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { useStore } from "@/lib/store";
import { ACTIVITIES, DOMAINS, domainOf, toneBg, SEED_CHILDREN } from "@/lib/data";
import { Avatar, PageHeader, StartButton } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { recommendFor, analyseChild, type Recommendation } from "@/lib/recommend";
import {
  fetchActivityLogs,
  saveActivityLog,
  queuePendingTrial,
  initOfflineQueue,
  getPendingTrials,
  registerTrialChangeListener,
  registerAutoSyncOnOnline,
  isCompletedTrial,
  type ActivityLogOutcome,
  type ActivityLogRecord,
} from "@/lib/activityLogs";
import {
  fetchPersonalizedRecommendations,
  createEvidenceFingerprint,
  invalidateRecommendationCache,
  checkAIStatus,
  type PersonalizedPedagogy,
} from "@/lib/aiRecommendations";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Personalized Recommendations — VikasSetu" },
      {
        name: "description",
        content:
          "Observation-driven learning recommendations powered by Groq AI, tailored to each child's strengths and learning needs.",
      },
      { property: "og:title", content: "Personalized Recommendations — VikasSetu" },
      {
        property: "og:description",
        content:
          "Observation-driven learning recommendations powered by Groq AI, tailored to each child's strengths and learning needs.",
      },
    ],
  }),
  component: RecommendationsPage,
});

function formatOutcomeLabel(outcome: string) {
  switch (outcome) {
    case "tried_helped":
      return "Tried — Helped";
    case "tried_needs_support":
      return "Tried — Needs Support";
    case "not_tried":
      return "Not Tried";
    default:
      return outcome;
  }
}

function RecommendationsPage() {
  const { children, observations } = useStore();
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [inlineStatus, setInlineStatus] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});

  // AI Recommendations State
  const [aiRecsMap, setAiRecsMap] = useState<Record<string, PersonalizedPedagogy>>({});
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const refreshAllLogs = async () => {
    await initOfflineQueue();
    const queued = getPendingTrials();
    const res = await fetchActivityLogs();
    if (!isMountedRef.current) return;

    const confirmed = res.success ? res.data : [];
    const queuedAsRecords: ActivityLogRecord[] = queued.map((q, idx) => ({
      ...q,
      id: -(idx + 1),
      createdAt: q.queuedAt,
    }));

    // Merge: queued trials take precedence over confirmed trials
    setLogs([...queuedAsRecords, ...confirmed]);
    setIsLoadingLogs(false);
  };

  // 1. Initial Activity Logs & AI Backend Status Fetch
  useEffect(() => {
    refreshAllLogs();

    checkAIStatus().then((status) => {
      if (isMountedRef.current) {
        setAiStatus(status);
      }
    });

    const unsubTrial = registerTrialChangeListener(() => {
      refreshAllLogs();
    });
    const unsubOnline = registerAutoSyncOnOnline(() => {
      refreshAllLogs();
    });

    return () => {
      unsubTrial();
      unsubOnline();
    };
  }, []);

  // Include all children, ensuring persistent seed children like Yash are always present
  const allChildren = useMemo(() => {
    const list = [...children];
    for (const sc of SEED_CHILDREN) {
      if (!list.some((c) => c.id === sc.id)) {
        list.push(sc);
      }
    }
    return list;
  }, [children]);

  // Separate children into observed vs first observations pending
  const observedChildren = useMemo(
    () =>
      allChildren.filter(
        (c) =>
          !analyseChild(c, observations).hasNoObservations ||
          logs.some((l) => l.childId === c.id),
      ),
    [allChildren, observations, logs],
  );
  const pendingChildren = useMemo(
    () =>
      allChildren.filter(
        (c) =>
          analyseChild(c, observations).hasNoObservations &&
          !logs.some((l) => l.childId === c.id),
      ),
    [allChildren, observations, logs],
  );

  // Generate deterministic base recommendations
  const baseRecs = useMemo(() => {
    const list: { recommendation: Recommendation; unobservedDomains: string[] }[] = [];
    for (const child of observedChildren) {
      const analysis = analyseChild(child, observations);
      const childRecs = recommendFor(child, observations, logs);
      const unobserved = DOMAINS.filter((d) => !analysis.observedDomains.includes(d.id)).map(
        (d) => d.name,
      );

      for (const r of childRecs) {
        list.push({ recommendation: r, unobservedDomains: unobserved });
      }
    }
    // Sort: level 1 first, then level 2
    return list.sort((a, b) => a.recommendation.level - b.recommendation.level);
  }, [observedChildren, observations, logs]);

  // 2. Fetch personalized Groq AI recommendations for observed children
  useEffect(() => {
    if (isLoadingLogs) return;

    for (const child of observedChildren) {
      const childLogs = logs.filter((l) => l.childId === child.id);
      const completedIds = childLogs
        .filter((l) => isCompletedTrial(l.outcome))
        .map((l) => l.activityId);

      const childObsDates = observations
        .filter((o) => o.childId === child.id)
        .map((o) => o.date);
      const fingerprint = createEvidenceFingerprint(childObsDates, childLogs.length, completedIds);

      const childObs = observations.filter((o) => o.childId === child.id);
      const childTrials = childLogs.map((l) => ({
        activityId: l.activityId,
        outcome: l.outcome,
        note: l.note,
        completedSteps: l.completedSteps,
        totalSteps: l.totalSteps,
        createdAt: l.createdAt,
      }));

      fetchPersonalizedRecommendations(child.id, fingerprint, {
        child,
        observations: childObs,
        recentTrials: childTrials,
      }).then((aiResult) => {
        if (!isMountedRef.current || !aiResult || !aiResult.recommendations) return;

        setAiRecsMap((prev) => {
          const next = { ...prev };
          for (const item of aiResult.recommendations) {
            // Strictly key by childId:activityId
            next[`${child.id}:${item.activityId}`] = item;
          }
          return next;
        });
      });
    }
  }, [isLoadingLogs, observedChildren, observations, logs]);

  const toggleCardExpanded = (cardKey: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const handleRecordOutcome = async (
    childId: string,
    activityId: string,
    totalSteps: number,
    outcome: ActivityLogOutcome,
  ) => {
    const key = `${childId}-${activityId}`;
    setSavingKey(key);
    const note = activeNotes[key]?.trim();

    const payload = {
      childId,
      activityId,
      completedSteps:
        outcome === "tried_helped"
          ? totalSteps
          : outcome === "tried_needs_support"
            ? Math.max(1, totalSteps - 1)
            : 0,
      totalSteps,
      outcome,
      note: note || undefined,
    };

    const res = await saveActivityLog(payload);
    setSavingKey(null);

    if (res.success && res.data) {
      invalidateRecommendationCache(childId);
      setLogs((prev) => [res.data!, ...prev.filter((l) => l.id !== res.data!.id)]);
      setInlineStatus((prev) => ({
        ...prev,
        [key]: {
          type: "success",
          message: `Saved outcome: "${formatOutcomeLabel(outcome)}"`,
        },
      }));
      setActiveNotes((prev) => ({ ...prev, [key]: "" }));
    } else {
      // Offline fallback: save to persistent offline queue immediately
      const queuedItem = queuePendingTrial(payload, res.error);
      invalidateRecommendationCache(childId);
      const offlineRecord: ActivityLogRecord = {
        ...queuedItem,
        id: -Date.now(),
        createdAt: queuedItem.queuedAt,
      };
      setLogs((prev) => [offlineRecord, ...prev]);
      setInlineStatus((prev) => ({
        ...prev,
        [key]: {
          type: "success",
          message: `Saved offline: "${formatOutcomeLabel(outcome)}" (pending sync)`,
        },
      }));
      setActiveNotes((prev) => ({ ...prev, [key]: "" }));
    }
  };

  return (
    <div className="fade-up space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          eyebrow="Individualized AI Teaching Engine"
          title="Recommendations"
          subtitle="Observation-driven pedagogical guidance personalized to each child's strengths, difficulties, and classroom trials."
        />

        {/* AI Engine Status Badge */}
        {aiStatus && (
          <div className="flex items-center gap-2 self-start rounded-2xl border border-primary/20 bg-primary-soft/60 px-3.5 py-2 text-xs font-semibold text-primary backdrop-blur-sm sm:self-auto">
            {aiStatus.configured ? (
              <>
                <Sparkles className="h-4 w-4 shrink-0 text-primary animate-pulse" />
                <span>
                  <strong>Groq AI Active</strong> ({aiStatus.model})
                </span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 shrink-0 text-teal" />
                <span>Deterministic Pedagogical Engine Active</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Advisory Banner */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-border/80 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span>
          <strong>Pedagogical Guidance:</strong> AI teaching strategies are suggestions designed to support teacher planning, grounded in actual observations. They are recommendations, not definitive diagnoses.
        </span>
      </div>

      {/* Process summary banner */}
      <div className="card-soft mb-8 grid gap-3 p-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        {[
          { icon: Eye, t: "Real Evidence", d: "Demonstrated skills & difficulties", c: "bg-teal-soft text-teal" },
          {
            icon: Target,
            t: "Catalog Matching",
            d: "Eligible activities for level",
            c: "bg-coral-soft text-coral",
          },
          {
            icon: Sparkles,
            t: "Personalized Strategy",
            d: "Step-by-step guidance & next steps",
            c: "bg-primary-soft text-primary",
          },
        ].map((s, i) => (
          <div key={s.t} className="contents">
            {i > 0 && (
              <ArrowRight className="mx-auto hidden h-6 w-6 text-muted-foreground sm:block" />
            )}
            <div className="flex items-center gap-3">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", s.c)}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-display text-lg font-bold">{s.t}</p>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Recommendations List */}
      <div className="space-y-6 stagger">
        {baseRecs.map(({ recommendation: r, unobservedDomains }) => {
          // Strict filtering: ensure completed activities are never resolved as active
          const childCompletedIds = new Set(
            logs
              .filter((l) => l.childId === r.child.id && isCompletedTrial(l.outcome))
              .map((l) => l.activityId),
          );

          const aiItem = aiRecsMap[`${r.child.id}:${r.activity.id}`];

          // If AI engine recommended a specific alternative, resolve it only if untried
          const activeActivity =
            (aiItem?.activityId &&
              !childCompletedIds.has(aiItem.activityId) &&
              ACTIVITIES.find((a) => a.id === aiItem.activityId)) ||
            r.activity;

          const d = domainOf(activeActivity.domain || r.domain);

          const cardKey = `${r.child.id}-${activeActivity.id}`;
          const status = inlineStatus[cardKey];
          const isSaving = savingKey === cardKey;

          const isExpanded = expandedCards[cardKey] ?? true;

          return (
            <div key={cardKey} className="card-soft overflow-hidden border border-border/80 shadow-sm transition hover:shadow-md">
              <div className="grid lg:grid-cols-12">
                {/* Child Summary Column */}
                <div className="border-b p-5 lg:col-span-3 lg:border-b-0 lg:border-r">
                  <div className="flex items-center gap-3">
                    <Avatar child={r.child} />
                    <div>
                      <Link
                        to="/children/$id"
                        params={{ id: r.child.id }}
                        className="font-display text-2xl font-bold hover:text-primary"
                      >
                        {r.child.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.child.age} years old · {d?.name ?? r.domain}
                      </p>
                    </div>
                  </div>

                  {/* AI / Pedagogical Badge */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {aiItem?.isAiGenerated ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Personalized Plan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-teal/30 bg-teal-soft px-2.5 py-1 text-xs font-bold text-teal">
                        <Zap className="h-3.5 w-3.5" />
                        Pedagogical Plan
                      </span>
                    )}

                    {r.isEarlySuggestion && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-sun-soft px-2.5 py-1 text-xs font-bold text-sun-foreground">
                        ⚡ Initial Observation
                      </span>
                    )}
                  </div>

                  {/* Observed Strengths Section */}
                  {aiItem?.observedStrengths && aiItem.observedStrengths.length > 0 && (
                    <div className="mt-4 rounded-xl border border-teal/20 bg-teal-soft/40 p-3 text-xs">
                      <p className="font-bold text-teal flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Strengths to build on:
                      </p>
                      <ul className="mt-1.5 space-y-1 text-foreground/90">
                        {aiItem.observedStrengths.map((str, idx) => (
                          <li key={idx} className="leading-tight">
                            • {str}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Focus Skills Section */}
                  {aiItem?.focusSkills && aiItem.focusSkills.length > 0 && (
                    <div className="mt-3 rounded-xl border border-coral/20 bg-coral-soft/30 p-3 text-xs">
                      <p className="font-bold text-coral flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" /> Target Skills:
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {aiItem.focusSkills.map((sk, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unobserved notes */}
                  {unobservedDomains.length > 0 && (
                    <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs">
                      <p className="font-bold text-muted-foreground">Unobserved areas:</p>
                      <p className="mt-0.5 text-muted-foreground">{unobservedDomains.join(", ")}</p>
                    </div>
                  )}
                </div>

                {/* Pedagogical Strategy Column */}
                <div className="border-b p-5 lg:col-span-4 lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-coral">
                      Target Learning Area
                    </p>
                    <span className="rounded-lg bg-coral-soft px-2 py-0.5 text-xs font-bold text-coral">
                      Level {r.level}/3
                    </span>
                  </div>

                  <p className="mt-1 font-display text-lg font-bold">
                    {aiItem?.title || (d ? `${d.emoji} ${d.name}` : r.domain)}
                  </p>

                  {/* Why this child needs it */}
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Why this activity fits {r.child.name}:
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">
                      "{aiItem?.reason || r.reason}"
                    </p>
                  </div>

                  {/* Evidence Display */}
                  {(aiItem?.evidence?.length ? aiItem.evidence : r.evidence).length > 0 && (
                    <div className="mt-4 rounded-xl border border-muted bg-muted/40 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Classroom Evidence Grounding:
                      </p>
                      <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                        {(aiItem?.evidence?.length ? aiItem.evidence : r.evidence)
                          .slice(0, 2)
                          .map((ev, idx) => (
                            <li key={idx} className="italic">
                              "{ev}"
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* Concrete Teaching Strategy */}
                  {aiItem?.teachingStrategy && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-primary-soft/30 p-3.5">
                      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                        <Lightbulb className="h-4 w-4" /> Teaching Strategy:
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-foreground font-medium">
                        {aiItem.teachingStrategy}
                      </p>
                    </div>
                  )}

                  {/* Scaffolding Adaptation */}
                  {(r.scaffoldingNote || aiItem?.nextStepIfSupportNeeded) && (
                    <div className="mt-3 rounded-xl border border-amber/30 bg-amber-soft/40 p-3.5 text-xs text-amber-900 dark:text-amber-100">
                      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        <Compass className="h-4 w-4" /> Scaffolding Adaptation:
                      </p>
                      <p className="mt-1 text-xs leading-relaxed font-medium">
                        {r.scaffoldingNote || aiItem?.nextStepIfSupportNeeded}
                      </p>
                    </div>
                  )}
                </div>

                {/* Activity, Step-by-Step Guidance & Outcome Logging Column */}
                <div
                  className={cn(
                    "flex flex-col justify-between p-5 lg:col-span-5",
                    d ? toneBg[d.tone] : "bg-muted",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-xl font-bold">
                          {activeActivity.emoji} {activeActivity.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activeActivity.minutes} min · {activeActivity.difficulty}
                        </p>
                      </div>
                      <StartButton activityId={activeActivity.id} childId={r.child.id} />
                    </div>

                    {/* Secondary suggestion */}
                    {r.secondaryActivity && (
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">
                        Alternative: {r.secondaryActivity.emoji} {r.secondaryActivity.name}
                      </p>
                    )}

                    {/* Last time info */}
                    {r.lastTrial && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>
                          Last time:{" "}
                          {r.lastTrial.date
                            ? new Date(r.lastTrial.date).toLocaleDateString()
                            : "Previously"}{" "}
                          — Outcome: <strong>{formatOutcomeLabel(r.lastTrial.outcome)}</strong>
                          {r.lastTrial.note ? ` ("${r.lastTrial.note}")` : ""}
                        </span>
                      </div>
                    )}

                    {/* Collapsible Actionable Teacher Steps & Success Criteria */}
                    <div className="mt-4 rounded-2xl border border-border/80 bg-background/95 p-3.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleCardExpanded(cardKey)}
                        className="flex w-full items-center justify-between text-left text-xs font-bold uppercase tracking-wide text-foreground hover:text-primary"
                      >
                        <span className="flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5 text-primary" /> Teacher Guidance & Steps
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3 pt-2 text-xs border-t border-border/50">
                          {/* Step by step teacher instructions */}
                          <div>
                            <p className="font-semibold text-muted-foreground mb-1.5">
                              Conducting the activity:
                            </p>
                            <ol className="space-y-1.5 text-foreground">
                              {(aiItem?.teacherSteps?.length ? aiItem.teacherSteps : activeActivity.steps).map(
                                (step, idx) => (
                                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                                      {idx + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ),
                              )}
                            </ol>
                          </div>

                          {/* Observable Success Criteria */}
                          {aiItem?.successCriteria && (
                            <div className="rounded-xl bg-teal-soft/40 p-2.5 border border-teal/20">
                              <p className="font-bold text-teal flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Observable Success Measure:
                              </p>
                              <p className="mt-1 text-foreground leading-relaxed">
                                {aiItem.successCriteria}
                              </p>
                            </div>
                          )}

                          {/* Progression vs Scaffolding Next Steps */}
                          {(aiItem?.nextStepIfSuccessful || aiItem?.nextStepIfSupportNeeded) && (
                            <div className="grid gap-2 sm:grid-cols-2 pt-1">
                              {aiItem.nextStepIfSuccessful && (
                                <div className="rounded-xl bg-muted/60 p-2">
                                  <p className="font-bold text-primary flex items-center gap-1 text-[11px]">
                                    <TrendingUp className="h-3 w-3" /> Next if successful:
                                  </p>
                                  <p className="mt-0.5 text-muted-foreground text-[11px] leading-tight">
                                    {aiItem.nextStepIfSuccessful}
                                  </p>
                                </div>
                              )}
                              {aiItem.nextStepIfSupportNeeded && (
                                <div className="rounded-xl bg-sun-soft/50 p-2">
                                  <p className="font-bold text-sun-foreground flex items-center gap-1 text-[11px]">
                                    <Lightbulb className="h-3 w-3" /> If support needed:
                                  </p>
                                  <p className="mt-0.5 text-sun-foreground/90 text-[11px] leading-tight">
                                    {aiItem.nextStepIfSupportNeeded}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Outcome Recording Section with the Exact 3 Buttons */}
                  <div className="mt-5 border-t border-border/40 pt-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Log Classroom Trial Outcome:
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          handleRecordOutcome(
                            r.child.id,
                            activeActivity.id,
                            activeActivity.steps.length,
                            "tried_helped",
                          )
                        }
                        className="rounded-xl border border-teal/40 bg-teal-soft px-2 py-1.5 text-center text-xs font-bold text-teal transition hover:opacity-90 disabled:opacity-50"
                      >
                        Tried — Helped
                      </button>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          handleRecordOutcome(
                            r.child.id,
                            activeActivity.id,
                            activeActivity.steps.length,
                            "tried_needs_support",
                          )
                        }
                        className="rounded-xl border border-sun/40 bg-sun-soft px-2 py-1.5 text-center text-xs font-bold text-sun-foreground transition hover:opacity-90 disabled:opacity-50"
                      >
                        Tried — Needs Support
                      </button>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          handleRecordOutcome(
                            r.child.id,
                            activeActivity.id,
                            activeActivity.steps.length,
                            "not_tried",
                          )
                        }
                        className="rounded-xl border border-border bg-background/70 px-2 py-1.5 text-center text-xs font-bold text-muted-foreground transition hover:opacity-90 disabled:opacity-50"
                      >
                        Not Tried
                      </button>
                    </div>

                    {/* Optional Note Input */}
                    <input
                      type="text"
                      placeholder="Optional observation note..."
                      value={activeNotes[cardKey] || ""}
                      onChange={(e) =>
                        setActiveNotes((prev) => ({ ...prev, [cardKey]: e.target.value }))
                      }
                      className="mt-2 w-full rounded-xl border border-border/60 bg-background/90 px-3 py-1.5 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                    />

                    {/* Inline Status Message (Success or Inline Failure) */}
                    {status && (
                      <div
                        className={cn(
                          "mt-2 flex items-center gap-1.5 rounded-xl p-2 text-xs font-semibold",
                          status.type === "error"
                            ? "border border-coral/30 bg-coral-soft text-coral"
                            : "border border-teal/30 bg-teal-soft text-teal",
                        )}
                      >
                        {status.type === "error" ? (
                          <AlertCircle className="h-4 w-4 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                        )}
                        <span>
                          {status.type === "error"
                            ? `Could not save outcome: ${status.message}. (Recommendations remain active)`
                            : status.message}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* First observations pending Section */}
      {pendingChildren.length > 0 && (
        <section className="card-soft mt-10 p-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-coral" />
            <h2 className="font-display text-2xl font-bold">First observations pending</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            More observations are needed to suggest a personalized next activity. Record what the child
            can do independently and where they need support across any of the 5 learning areas.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {pendingChildren.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between rounded-2xl bg-muted/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar child={ch} />
                  <div>
                    <Link
                      to="/children/$id"
                      params={{ id: ch.id }}
                      className="font-bold hover:text-primary"
                    >
                      {ch.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {ch.age} yrs · Pending observations
                    </p>
                  </div>
                </div>
                <Link
                  to="/progress"
                  search={{ child: ch.id }}
                  className="rounded-xl bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                >
                  Record
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
