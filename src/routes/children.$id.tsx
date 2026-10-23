import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  PenLine,
  CheckCircle2,
  HeartHandshake,
  CloudUpload,
  Sparkles,
  BookOpen,
  Lightbulb,
  Zap,
  Target,
  Compass,
} from "lucide-react";
import { useStore, isPresentToday, attendancePct } from "@/lib/store";
import { ACTIVITIES, activityOf, domainOf, toneBg, DOMAINS, SEED_CHILDREN, type DomainId, type Score } from "@/lib/data";
import { recommendFor, analyseChild, type ActivityLogSummary } from "@/lib/recommend";
import {
  fetchChildActivityHistory,
  syncPendingTrials,
  dismissPendingTrial,
  getStorageStatus,
  registerAutoSyncOnOnline,
  registerTrialChangeListener,
  isCompletedTrial,
  summarizeChildPracticeHistory,
  type ChildActivityHistoryItem,
} from "@/lib/activityLogs";
import {
  fetchPersonalizedRecommendations,
  createEvidenceFingerprint,
  type PersonalizedPedagogy,
} from "@/lib/aiRecommendations";
import { Avatar, DomainBars, DomainChip, ScoreBadge, StartButton, SyncStatusBadge } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/children/$id")({
  head: () => ({
    meta: [
      { title: "Child profile — VikasSetu" },
      {
        name: "description",
        content: "Learning overview, strengths, needs and recommended activities for a child.",
      },
      { property: "og:title", content: "Child profile — VikasSetu" },
      {
        property: "og:description",
        content: "Learning overview, strengths, needs and recommended activities for a child.",
      },
    ],
  }),
  component: Profile,
});

function formatOutcomeLabel(outcome: string): string {
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

function Profile() {
  const { id } = Route.useParams();
  const { children, observations, attendance } = useStore();
  const ch = children.find((c) => c.id === id) || SEED_CHILDREN.find((c) => c.id === id);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [trials, setTrials] = useState<ChildActivityHistoryItem[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(true);
  const [trialsError, setTrialsError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadTrials = async () => {
    if (!ch?.id) return;
    setIsLoadingTrials(true);
    setTrialsError(null);
    try {
      const res = await fetchChildActivityHistory(ch.id);
      if (isMountedRef.current) {
        setTrials(res.all);
      }
    } catch {
      if (isMountedRef.current) {
        setTrials([]);
        setTrialsError("Could not retrieve activity trials from server. Pending offline records remain safe.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingTrials(false);
      }
    }
  };

  useEffect(() => {
    if (!ch?.id) return;
    setTrials([]);
    setAiRecs([]);
    loadTrials();
    const unsubOnline = registerAutoSyncOnOnline(() => {
      loadTrials();
    });
    const unsubTrial = registerTrialChangeListener((trialChildId) => {
      if (trialChildId === ch.id) {
        loadTrials();
      }
    });
    return () => {
      unsubOnline();
      unsubTrial();
    };
  }, [ch?.id]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncPendingTrials({ force: true });
      if (res.syncedCount > 0) {
        setSyncMessage(
          `Successfully synced ${res.syncedCount} trial${res.syncedCount > 1 ? "s" : ""}!`,
        );
      } else if (res.errors.length > 0) {
        setSyncMessage(`Sync failed: ${res.errors[0]}`);
      } else {
        setSyncMessage("All pending trials already synced.");
      }
      await loadTrials();
    } catch {
      setSyncMessage("Sync failed. Server may be offline.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDismissTrial = async (queueId: string) => {
    dismissPendingTrial(queueId);
    await loadTrials();
  };

  const handleDismissAllFailed = async () => {
    trials
      .filter((t) => t.type === "queued" && t.queued.status === "sync_failed")
      .forEach((t) => {
        if (t.type === "queued") dismissPendingTrial(t.queued.queueId);
      });
    await loadTrials();
  };

  if (!ch)
    return (
      <div className="py-20 text-center">
        <p>Child not found.</p>
        <Link to="/children" className="btn btn-primary mt-4">
          Back
        </Link>
      </div>
    );

  const completedActivityIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of trials) {
      const outcome = t.type === "confirmed" ? t.record.outcome : t.queued.outcome;
      if (isCompletedTrial(outcome)) {
        const actId = t.type === "confirmed" ? t.record.activityId : t.queued.activityId;
        if (actId) ids.add(actId);
      }
    }
    return ids;
  }, [trials]);

  const activitySummaries: ActivityLogSummary[] = trials.map((t) => {
    if (t.type === "confirmed") {
      return {
        childId: t.record.childId,
        activityId: t.record.activityId,
        outcome: t.record.outcome,
        completedSteps: t.record.completedSteps,
        totalSteps: t.record.totalSteps,
        note: t.record.note,
        createdAt: t.record.createdAt,
      };
    } else {
      return {
        childId: t.queued.childId,
        activityId: t.queued.activityId,
        outcome: t.queued.outcome,
        completedSteps: t.queued.completedSteps,
        totalSteps: t.queued.totalSteps,
        note: t.queued.note,
        createdAt: t.queued.queuedAt,
      };
    }
  });

  const obs = observations.filter((o) => o.childId === ch.id);
  const recs = recommendFor(ch, obs, activitySummaries);
  const analysis = analyseChild(ch, obs);
  const present = isPresentToday(attendance, ch.id);
  const hasQueued = trials.some((t) => t.type === "queued");

  // Fetch AI personalized recommendations for child profile
  const [aiRecs, setAiRecs] = useState<PersonalizedPedagogy[]>([]);

  useEffect(() => {
    if (!ch?.id || isLoadingTrials) return;
    const obsDates = observations
      .filter((o) => o.childId === ch.id)
      .map((o) => o.date);
    const fingerprint = createEvidenceFingerprint(
      obsDates,
      trials.length,
      Array.from(completedActivityIds),
    );

    fetchPersonalizedRecommendations(ch.id, fingerprint, {
      child: ch,
      observations: obs,
      recentTrials: activitySummaries,
    }).then((res) => {
      if (!isMountedRef.current || !res || !res.recommendations) return;
      setAiRecs(res.recommendations);
    });
  }, [ch?.id, isLoadingTrials, observations.length, trials.length, completedActivityIds]);

  // Combine recommendations so AI-generated plans take priority, completed activities are strictly excluded,
  // and exactly 2 distinct active recommendations are maintained whenever eligible activities exist.
  const displayCards = useMemo(() => {
    const untriedAi: PersonalizedPedagogy[] = [];
    const chosenActIds = new Set<string>();

    for (const item of aiRecs) {
      if (!item.activityId) continue;
      if (completedActivityIds.has(item.activityId)) continue;
      if (chosenActIds.has(item.activityId)) continue;
      chosenActIds.add(item.activityId);
      untriedAi.push(item);
      if (untriedAi.length >= 2) break;
    }

    const cards: {
      key: string;
      domain: DomainId;
      activity: (typeof ACTIVITIES)[0];
      level: Score;
      reason: string;
      aiItem?: PersonalizedPedagogy | undefined;
      scaffoldingNote?: string | undefined;
    }[] = [];

    // 1. Convert valid untried AI recommendations to cards
    for (const aiItem of untriedAi) {
      const act =
        ACTIVITIES.find((a) => a.id === aiItem.activityId) ||
        ACTIVITIES.find((a) => a.domain === aiItem.domain) || {
          id: aiItem.activityId,
          domain: aiItem.domain as DomainId,
          name: aiItem.title,
          emoji: "✨",
          level: 1 as Score,
          forLevel: [1, 2] as Score[],
          difficulty: "Easy" as const,
          minutes: 10,
          description: aiItem.reason,
          steps: aiItem.teacherSteps,
          skills: aiItem.focusSkills,
        };
      const matchingRec = recs.find(
        (r) => r.activity.id === act.id || r.domain === aiItem.domain,
      );
      cards.push({
        key: `ai-${aiItem.domain}-${aiItem.activityId}`,
        domain: (act.domain || aiItem.domain) as DomainId,
        activity: act,
        level: matchingRec?.level ?? 1,
        reason: aiItem.reason,
        aiItem,
        scaffoldingNote: aiItem.nextStepIfSupportNeeded || matchingRec?.scaffoldingNote,
      });
    }

    // 2. If fewer than 2 cards, refill vacant slot(s) from deterministic recs (recommendFor)
    if (cards.length < 2) {
      for (const r of recs) {
        if (cards.length >= 2) break;
        if (completedActivityIds.has(r.activity.id)) continue;
        if (chosenActIds.has(r.activity.id)) continue;

        chosenActIds.add(r.activity.id);
        cards.push({
          key: `rec-${r.domain}-${r.activity.id}`,
          domain: r.activity.domain as DomainId,
          activity: r.activity,
          level: r.level,
          reason: r.reason,
          scaffoldingNote: r.scaffoldingNote,
        });
      }
    }

    // 3. If still fewer than 2 cards, refill from remaining untried activities across the catalog
    if (cards.length < 2) {
      for (const act of ACTIVITIES) {
        if (cards.length >= 2) break;
        if (completedActivityIds.has(act.id)) continue;
        if (chosenActIds.has(act.id)) continue;

        chosenActIds.add(act.id);
        cards.push({
          key: `cat-${act.domain}-${act.id}`,
          domain: act.domain,
          activity: act,
          level: (act.forLevel[0] || 1) as Score,
          reason: `${ch.name} can explore ${act.name} to build hands-on skills in ${domainOf(act.domain)?.name || act.domain}.`,
        });
      }
    }

    return cards;
  }, [aiRecs, recs, completedActivityIds, ch.name]);

  const practiceSummary = useMemo(
    () => summarizeChildPracticeHistory(trials, (id) => activityOf(id)?.domain),
    [trials],
  );

  return (
    <div className="fade-up space-y-6">
      <Link
        to="/children"
        className="inline-flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All children
      </Link>

      <section
        className={cn(
          "flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8",
          toneBg[ch.tone],
        )}
      >
        <Avatar child={ch} size="lg" />
        <div className="flex-1">
          <h1 className="text-4xl font-bold">{ch.name}</h1>
          <p className="mt-1 font-semibold text-muted-foreground">
            {ch.age} years · {present ? "Present today" : "Absent today"} ·{" "}
            {attendancePct(attendance, ch.id)}% attendance
          </p>
        </div>
        <Link to="/progress" search={{ child: ch.id }} className="btn btn-primary">
          <PenLine className="h-4 w-4" /> Record Observation
        </Link>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card-soft p-6 lg:col-span-3">
          <h2 className="mb-1 text-2xl font-bold">Learning Overview</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            1 = Needs Support · 2 = Developing · 3 = Good
          </p>
          <DomainBars child={ch} />
        </section>
        <div className="space-y-6 lg:col-span-2">
          <section className="card-soft p-6">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold">
              <CheckCircle2 className="h-5 w-5 text-primary" /> What {ch.name} is doing well
            </h3>
            <ul className="space-y-2">
              {(ch.strengths.length ? ch.strengths : ["Observations coming soon"]).map((s) => (
                <li key={s} className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold">
                  {s}
                </li>
              ))}
            </ul>
          </section>
          <section className="card-soft p-6">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-bold">
              <HeartHandshake className="h-5 w-5 text-coral" /> Needs more support
            </h3>
            <ul className="space-y-2">
              {ch.needs.map((s) => (
                <li key={s} className="rounded-xl bg-sun-soft px-3 py-2 text-sm font-semibold">
                  {s}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recommended Activities</h2>
          <span className="text-xs font-semibold text-muted-foreground">
            Observation-driven teaching guidance
          </span>
        </div>

        {displayCards.length === 0 ? (
          analysis.hasNoObservations ? (
            <div className="card-soft p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-soft text-coral">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold">First observations pending</h3>
              <p className="max-w-md mx-auto text-sm text-muted-foreground">
                More observations are needed to suggest a personalized next activity. Record what {ch.name} can do independently and where they need support across any of the 5 learning areas.
              </p>
              <Link to="/progress" search={{ child: ch.id }} className="btn btn-primary inline-flex">
                <PenLine className="h-4 w-4" /> Record First Observation
              </Link>
            </div>
          ) : (
            <div className="card-soft p-6 text-center space-y-3">
              <p className="max-w-md mx-auto text-sm text-muted-foreground">
                More observations are needed to suggest a personalized next activity. Record what {ch.name} can do independently and where they need support.
              </p>
              <Link to="/progress" search={{ child: ch.id }} className="btn btn-primary inline-flex">
                <PenLine className="h-4 w-4" /> Record Observation
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {analysis.allAssessedMastered ? (
              <div className="rounded-2xl border border-teal/40 bg-teal-soft/40 p-4 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-teal shrink-0" />
                <p className="text-xs text-foreground font-medium">
                  <strong>Assessed Learning Areas on Track:</strong> {ch.name} has demonstrated mastery across all 5 learning areas (Level 3/3). Recommended activities below provide creative extension and peer leadership opportunities.
                </p>
              </div>
            ) : analysis.unobservedDomains.length > 0 && analysis.observedDomains.length > 0 ? (
              <div className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Showing recommendations based on recorded observations in{" "}
                  <strong>{analysis.observedDomains.map((d) => domainOf(d)?.name).join(", ")}</strong>.
                  Other areas ({analysis.unobservedDomains.map((d) => domainOf(d)?.name).join(", ")}) can be explored through upcoming classroom activities.
                </span>
                <Link
                  to="/progress"
                  search={{ child: ch.id }}
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline shrink-0"
                >
                  <PenLine className="h-3.5 w-3.5" /> Record in other areas
                </Link>
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2 stagger">
            {displayCards.map((card) => {
              const aiItem = card.aiItem;
              const dom = domainOf(card.domain);
              const activeActivity = card.activity;

              return (
                <div key={card.key} className="card-soft flex flex-col justify-between p-5 border border-border/80 shadow-sm transition hover:shadow-md">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shrink-0",
                            dom ? toneBg[dom.tone] : "bg-muted",
                          )}
                        >
                          {activeActivity.emoji}
                        </div>
                        <div>
                          <p className="font-display text-lg font-bold">{activeActivity.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {activeActivity.minutes} min · {activeActivity.difficulty} · Level {card.level}/3
                          </p>
                        </div>
                      </div>

                      {aiItem?.isAiGenerated ? (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary shrink-0">
                          <Sparkles className="h-3 w-3" /> AI Plan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-teal/30 bg-teal-soft px-2 py-0.5 text-xs font-bold text-teal shrink-0">
                          <Zap className="h-3 w-3" /> Pedagogical
                        </span>
                      )}
                    </div>

                    {/* Evidence Grounded Reason */}
                    <blockquote className="my-3 rounded-xl border-l-4 border-primary bg-primary-soft/30 px-3 py-2 text-xs font-medium leading-relaxed text-foreground">
                      "{aiItem?.reason || card.reason}"
                    </blockquote>

                    {/* Concrete Teaching Strategy */}
                    {aiItem?.teachingStrategy && (
                      <div className="mt-2.5 rounded-xl bg-background/80 p-2.5 text-xs border border-border/60">
                        <p className="font-bold text-primary flex items-center gap-1 text-[11px] uppercase tracking-wide">
                          <Lightbulb className="h-3.5 w-3.5" /> Strategy:
                        </p>
                        <p className="mt-1 text-foreground leading-relaxed">
                          {aiItem.teachingStrategy}
                        </p>
                      </div>
                    )}

                    {/* Step by step teacher instructions */}
                    <div className="mt-2.5 space-y-1.5 text-xs">
                      <p className="font-bold text-muted-foreground text-[11px] uppercase tracking-wide">
                        Teacher Steps:
                      </p>
                      <ol className="space-y-1 text-foreground">
                        {(aiItem?.teacherSteps?.length ? aiItem.teacherSteps : activeActivity.steps).map(
                          (step, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 leading-snug">
                              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[9px] font-bold text-primary">
                                {idx + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ),
                        )}
                      </ol>
                    </div>

                    {/* Success Criteria */}
                    {aiItem?.successCriteria && (
                      <div className="mt-2.5 rounded-xl bg-teal-soft/40 p-2 text-xs border border-teal/20">
                        <p className="font-bold text-teal flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="h-3 w-3" /> Observable Success Measure:
                        </p>
                        <p className="mt-0.5 text-foreground leading-snug">
                          {aiItem.successCriteria}
                        </p>
                      </div>
                    )}

                    {/* Scaffolding Adaptation */}
                    {(card.scaffoldingNote || aiItem?.nextStepIfSupportNeeded) && (
                      <div className="mt-2.5 rounded-xl bg-amber-soft/40 p-2 text-xs border border-amber/30 text-amber-900 dark:text-amber-100">
                        <p className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                          <Compass className="h-3.5 w-3.5" /> Scaffolding Adaptation:
                        </p>
                        <p className="mt-0.5 leading-snug">
                          {card.scaffoldingNote || aiItem?.nextStepIfSupportNeeded}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40">
                    <StartButton activityId={activeActivity.id} childId={ch.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </section>

      {/* Activity Trials Timeline */}
      <section className="card-soft p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Activity trials & progress</h2>
            <p className="text-sm text-muted-foreground">
              Step achievements and trial outcomes from recent activities with {ch.name}.
            </p>
          </div>
          <SyncStatusBadge
            pendingCount={
              trials.filter((t) => t.type === "queued" && t.queued.status !== "sync_failed").length
            }
            failedCount={
              trials.filter((t) => t.type === "queued" && t.queued.status === "sync_failed").length
            }
            isSyncing={isSyncing}
            onSync={hasQueued ? handleSync : undefined}
            onDismissFailed={
              trials.some((t) => t.type === "queued" && t.queued.status === "sync_failed")
                ? handleDismissAllFailed
                : undefined
            }
            isPersistent={getStorageStatus().isPersistent}
            storageWarning={getStorageStatus().warning}
          />
        </div>

        {syncMessage && (
          <div className="mb-4 rounded-xl bg-sun-soft px-4 py-2.5 text-xs font-semibold text-foreground">
            {syncMessage}
          </div>
        )}

        {isLoadingTrials ? (
          <p className="text-sm text-muted-foreground">Loading activity history...</p>
        ) : trialsError ? (
          <div className="rounded-2xl border border-coral/30 bg-coral-soft/50 p-4 text-xs font-semibold text-coral">
            {trialsError}
          </div>
        ) : trials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-muted-foreground">
            <p className="font-semibold">No activity trials recorded yet for {ch.name}.</p>
            <p className="mt-1 text-xs">
              Start an activity from the recommendations above to record steps and trial outcomes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Domain Practice Reflection Summary */}
            <div className="rounded-2xl border border-border/80 bg-background/70 p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">Practice Summary:</span>
                  <span className="rounded-lg bg-muted px-2 py-0.5 font-bold text-muted-foreground">
                    {practiceSummary.totalTrials} {practiceSummary.totalTrials === 1 ? "trial" : "trials"}
                  </span>
                  <span className="rounded-lg bg-teal-soft px-2 py-0.5 font-bold text-teal">
                    ✓ {practiceSummary.helpedCount} Helped
                  </span>
                  {practiceSummary.needsSupportCount > 0 && (
                    <span className="rounded-lg bg-amber-soft px-2 py-0.5 font-bold text-amber-700 dark:text-amber-400">
                      ⚠ {practiceSummary.needsSupportCount} Needed Support
                    </span>
                  )}
                </div>

                {Object.keys(practiceSummary.domainCounts).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground text-[11px] font-semibold">Active Areas:</span>
                    {Object.entries(practiceSummary.domainCounts).map(([domId, count]) => {
                      const dom = domainOf(domId as DomainId);
                      return (
                        <span
                          key={domId}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold",
                            dom ? toneBg[dom.tone] : "bg-muted text-foreground",
                          )}
                        >
                          {dom?.emoji} {dom?.name || domId} ({count})
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <ul className="space-y-3 stagger">
            {trials.map((item) => {
              const isQueued = item.type === "queued";
              const key = item.type === "queued" ? item.queued.queueId : `rec-${item.record.id}`;
              const itemData =
                item.type === "queued"
                  ? {
                      activityId: item.queued.activityId,
                      completedSteps: item.queued.completedSteps,
                      totalSteps: item.queued.totalSteps,
                      outcome: item.queued.outcome,
                      note: item.queued.note,
                      date: item.queued.queuedAt,
                    }
                  : {
                      activityId: item.record.activityId,
                      completedSteps: item.record.completedSteps,
                      totalSteps: item.record.totalSteps,
                      outcome: item.record.outcome,
                      note: item.record.note,
                      date: item.record.createdAt,
                    };

              const act = activityOf(itemData.activityId);
              const domain = act ? domainOf(act.domain) : null;

              return (
                <li
                  key={key}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-start sm:justify-between transition-colors",
                    isQueued
                      ? "bg-sun-soft/40 border border-sun/60"
                      : "bg-muted/60 border border-border/50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl",
                        domain ? toneBg[domain.tone] : "bg-muted",
                      )}
                    >
                      {act?.emoji || "🎯"}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {domain && <DomainChip id={domain.id} />}
                        <span className="font-bold text-foreground">
                          {act?.name || itemData.activityId}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-bold",
                            itemData.outcome === "tried_helped"
                              ? "bg-teal-soft text-teal"
                              : itemData.outcome === "tried_needs_support"
                                ? "bg-sun-soft text-foreground"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {formatOutcomeLabel(itemData.outcome)}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {itemData.completedSteps} of {itemData.totalSteps} steps completed
                        </span>
                        {isQueued && (
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-bold",
                              item.queued.status === "sync_failed"
                                ? "bg-coral-soft text-coral"
                                : "bg-sun-soft text-sun-foreground",
                            )}
                          >
                            {item.queued.status === "sync_failed" ? "⚠️ Sync failed" : "⏳ Saved offline"}
                          </span>
                        )}
                        {isQueued && item.queued.retryCount ? (
                          <span className="text-[0.7rem] text-muted-foreground">
                            · Retry #{item.queued.retryCount}
                          </span>
                        ) : null}
                      </div>
                      {isQueued && item.queued.status === "sync_failed" && item.queued.lastError && (
                        <p className="text-xs font-medium text-coral">
                          Error: {item.queued.lastError}
                        </p>
                      )}
                      {itemData.note && (
                        <p className="mt-1 text-xs italic text-foreground/80">
                          "{itemData.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-col sm:items-end">
                    <span>
                      {new Date(itemData.date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {isQueued ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSync}
                          disabled={isSyncing}
                          aria-label={item.queued.status === "sync_failed" ? `Retry syncing ${act?.name || "activity"} trial` : `Sync ${act?.name || "activity"} trial`}
                          className="btn btn-ghost inline-flex min-h-[44px] items-center rounded-lg bg-foreground/10 px-3 py-2 text-xs font-bold text-foreground hover:bg-foreground/20 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {item.queued.status === "sync_failed" ? "Retry" : "Sync"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissTrial(item.queued.queueId)}
                          aria-label={`Dismiss ${act?.name || "activity"} trial from queue`}
                          className="btn btn-ghost inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          title="Dismiss trial from queue"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-teal">✓ Confirmed</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      </section>

      <section className="card-soft p-6">
        <h2 className="mb-4 text-2xl font-bold">Observation history</h2>
        {obs.length === 0 ? (
          <p className="text-muted-foreground">No observations yet.</p>
        ) : (
          <ul className="space-y-3 stagger">
            {obs.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-2 rounded-2xl bg-muted p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DomainChip id={o.domain} />
                    <span className="text-sm font-bold">{activityOf(o.activityId)?.name}</span>
                  </div>
                  {o.note && <p className="mt-2 text-sm">"{o.note}"</p>}
                </div>
                <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                  <ScoreBadge score={o.score} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(o.date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
