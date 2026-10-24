import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef, useId, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Hash,
  Palette,
  Paintbrush,
  Users,
  Compass,
  Lightbulb,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  FileText,
  AlertCircle,
  Info,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  ACTIVITIES,
  DOMAINS,
  domainOf,
  SEED_CHILDREN,
  type Child,
  type DomainId,
  type Score,
} from "@/lib/data";
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
import { ChildAvatar } from "@/components/ChildAvatar";
import { useI18n, getDomainTitle, translateActivityName } from "@/lib/i18n";

type SearchParams = {
  child?: string | undefined;
};

export const Route = createFileRoute("/recommendations")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    child: typeof s["child"] === "string" ? s["child"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Recommended for Each Child — VikasSetu" },
      {
        name: "description",
        content:
          "Discover activities based on what each child enjoys, explores, and is ready to practise.",
      },
      { property: "og:title", content: "Recommended for Each Child — VikasSetu" },
      {
        property: "og:description",
        content:
          "Discover activities based on what each child enjoys, explores, and is ready to practise.",
      },
    ],
  }),
  component: RecommendationsPage,
});

const COLLAPSED_SELECTOR_LIMIT = 4;

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

/**
 * Domain Lucide line icon mapping ensuring consistent visual language without emojis.
 */
function getDomainIcon(domainId: string) {
  switch (domainId) {
    case "alphabet":
      return BookOpen;
    case "numbers":
      return Hash;
    case "colours":
      return Palette;
    case "art":
      return Paintbrush;
    case "stories":
      return Users;
    default:
      return Sparkles;
  }
}

/**
 * Keyboard-focusable, touch-readable info tooltip used for the pedagogical note.
 * Opens on hover/focus, toggles on tap, and closes on outside press, blur or Escape.
 */
function PedagogicalInfoTip({ note, children }: { note: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!wrapRef.current?.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--brand)] cursor-help focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      >
        {children}
        <Info className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
      </button>

      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className="absolute left-0 top-full z-50 mt-2 w-64 rounded-[10px] border border-[#E2D9C8] bg-[var(--card-bg)] px-3 py-2 text-[12px] font-normal leading-snug text-[var(--text)] shadow-[var(--shadow-warm-sm)] sm:left-auto sm:right-0"
        >
          {note}
        </span>
      )}
    </span>
  );
}

function RecommendationsPage() {
  const { children, observations } = useStore();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
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
  const [pendingTrialsCount, setPendingTrialsCount] = useState(0);

  // Selected child filter: "all" or specific child ID
  const [selectedChildId, setSelectedChildId] = useState<string | "all">(search.child || "all");

  // Child selector first-row toggle
  const [showAllChildren, setShowAllChildren] = useState(false);

  // Keep state synced with search param
  useEffect(() => {
    if (search.child) {
      setSelectedChildId(search.child);
    } else {
      setSelectedChildId("all");
    }
  }, [search.child]);

  const handleSelectChild = (id: string | "all") => {
    setSelectedChildId(id);
    navigate({
      to: "/recommendations",
      search: { child: id === "all" ? undefined : id },
      replace: true,
    });
  };

  // AI Recommendations State
  const [aiRecsMap, setAiRecsMap] = useState<Record<string, PersonalizedPedagogy>>({});
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);

  // Progressive disclosure accordion state (keyed by `${cardKey}-${sectionId}`)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const refreshAllLogs = async () => {
    await initOfflineQueue();
    const queued = getPendingTrials();
    setPendingTrialsCount(queued.length);
    const res = await fetchActivityLogs();
    if (!isMountedRef.current) return;

    const confirmed = res.success ? res.data : [];
    const queuedAsRecords: ActivityLogRecord[] = queued.map((q, idx) => ({
      ...q,
      id: -(idx + 1),
      createdAt: q.queuedAt,
    }));

    setLogs([...queuedAsRecords, ...confirmed]);
    setIsLoadingLogs(false);
  };

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

  // Ensure persistent seed children like Yash are included
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
          !analyseChild(c, observations).hasNoObservations || logs.some((l) => l.childId === c.id),
      ),
    [allChildren, observations, logs],
  );

  const pendingChildren = useMemo(
    () =>
      allChildren.filter(
        (c) =>
          analyseChild(c, observations).hasNoObservations && !logs.some((l) => l.childId === c.id),
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

  // Fetch personalized Groq AI recommendations for observed children
  useEffect(() => {
    if (isLoadingLogs) return;

    for (const child of observedChildren) {
      const childLogs = logs.filter((l) => l.childId === child.id);
      const completedIds = childLogs
        .filter((l) => isCompletedTrial(l.outcome))
        .map((l) => l.activityId);

      const childObsDates = observations.filter((o) => o.childId === child.id).map((o) => o.date);
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
            next[`${child.id}:${item.domain}`] = item;
            next[`${child.id}:${item.activityId}`] = item;
          }
          return next;
        });
      });
    }
  }, [isLoadingLogs, observedChildren, observations, logs]);

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
      const queuedItem = queuePendingTrial(payload, res.error);
      invalidateRecommendationCache(childId);
      const offlineRecord: ActivityLogRecord = {
        ...queuedItem,
        id: -Date.now(),
        createdAt: queuedItem.queuedAt,
      };
      setLogs((prev) => [offlineRecord, ...prev]);
      setPendingTrialsCount((c) => c + 1);
      setInlineStatus((prev) => ({
        ...prev,
        [key]: {
          type: "success",
          message: `Saved offline: "${formatOutcomeLabel(outcome)}" (queued for sync)`,
        },
      }));
      setActiveNotes((prev) => ({ ...prev, [key]: "" }));
    }
  };

  // Selected child object (when not "all")
  const selectedChild = useMemo(() => {
    if (selectedChildId === "all") return null;
    return allChildren.find((c) => c.id === selectedChildId) || null;
  }, [allChildren, selectedChildId]);

  // Recommendations for the currently selected child
  const singleChildRecs = useMemo(() => {
    if (!selectedChild) return [];
    return baseRecs.filter((item) => item.recommendation.child.id === selectedChild.id);
  }, [baseRecs, selectedChild]);

  // Context profile for the selected child
  const selectedChildContext = useMemo(() => {
    if (!selectedChild) return null;
    const analysis = analyseChild(selectedChild, observations);
    const childObs = observations
      .filter((o) => o.childId === selectedChild.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestObs = childObs[0] || null;

    return {
      analysis,
      totalObs: childObs.length,
      latestObs,
    };
  }, [selectedChild, observations]);

  // Overview summary data for "All Children" view (one consolidated item per observed child)
  const allChildrenOverview = useMemo(() => {
    return observedChildren
      .map((child) => {
        const analysis = analyseChild(child, observations);
        const childRecs = baseRecs.filter((item) => item.recommendation.child.id === child.id);
        const primaryRec = childRecs[0] || null;

        const childCompletedIds = new Set(
          logs
            .filter((l) => l.childId === child.id && isCompletedTrial(l.outcome))
            .map((l) => l.activityId),
        );

        let activeActivity = primaryRec ? primaryRec.recommendation.activity : null;
        let aiItem: PersonalizedPedagogy | null = null;
        let reason = primaryRec ? primaryRec.recommendation.reason : "";
        const level = primaryRec ? primaryRec.recommendation.level : 3;

        if (primaryRec) {
          aiItem =
            aiRecsMap[`${child.id}:${primaryRec.recommendation.domain}`] ||
            aiRecsMap[`${child.id}:${primaryRec.recommendation.activity.id}`] ||
            null;

          const aiActivityId = aiItem?.activityId;
          if (
            aiActivityId &&
            !childCompletedIds.has(aiActivityId) &&
            ACTIVITIES.some((a) => a.id === aiActivityId)
          ) {
            activeActivity = ACTIVITIES.find((a) => a.id === aiActivityId) || activeActivity;
          }

          if (aiItem?.reason) {
            reason = aiItem.reason;
          }
        }

        const domainId: DomainId =
          activeActivity?.domain || primaryRec?.recommendation.domain || "alphabet";
        const domainInfo = domainOf(domainId);

        return {
          child,
          analysis,
          hasRecs: Boolean(primaryRec && activeActivity),
          primaryRec,
          activeActivity,
          aiItem,
          reason,
          level,
          domainId,
          domainInfo,
          totalRecommendations: childRecs.length,
        };
      })
      .sort((a, b) => {
        // Sort priority: Children with Level 1 first, then Level 2, then completed
        if (a.hasRecs && !b.hasRecs) return -1;
        if (!a.hasRecs && b.hasRecs) return 1;
        return a.level - b.level;
      });
  }, [observedChildren, observations, baseRecs, logs, aiRecsMap]);

  // If a child is selected that is past row 1, auto-expand so their chip is visible
  const isSelectedBeyondFirstRow = useMemo(() => {
    if (selectedChildId === "all") return false;
    const idx = allChildren.findIndex((c) => c.id === selectedChildId);
    return idx >= COLLAPSED_SELECTOR_LIMIT;
  }, [allChildren, selectedChildId]);

  const isSelectorExpanded = showAllChildren || isSelectedBeyondFirstRow;
  const visibleChildren = isSelectorExpanded
    ? allChildren
    : allChildren.slice(0, COLLAPSED_SELECTOR_LIMIT);

  const activePlansCount = useMemo(() => {
    return allChildrenOverview.filter((o) => o.hasRecs).length;
  }, [allChildrenOverview]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 text-[var(--text)]">
      {/* =========================================================================
          PAGE TITLE + ONE-LINE DESCRIPTION & COMPACT GUIDANCE
         ========================================================================= */}
      <header className="space-y-2 pt-1">
        <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-baseline">
          <div className="space-y-1">
            <h1 className="font-display text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text)] leading-tight">
              {t("rec.title", "Recommended for Each Child")}
            </h1>
            <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">
              {t("rec.subtitle", "Discover activities based on what each child enjoys, explores, and is ready to practise.")}

            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* AI Guidance Indicator */}
            {aiStatus && (
              <PedagogicalInfoTip note="Suggestions are grounded in classroom observations to support planning, not formal developmental diagnoses.">
                {aiStatus.configured ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
                    <span>AI-Assisted Guidance</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
                    <span>{t("rec.curriculum_guidance", "Curriculum Guidance")}</span>
                  </>
                )}
              </PedagogicalInfoTip>
            )}

            {/* Offline Trials Indicator */}
            {pendingTrialsCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-section)] px-2.5 py-1 text-[12px] font-semibold text-[var(--text)]">
                <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>{pendingTrialsCount} {t("rec.queued", "queued")}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          CHILD SELECTOR SECTION (Tidy Responsive Grid with First Row + Show All)
         ========================================================================= */}
      <section aria-label="Child selector" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-bold text-[var(--text)]">{t("rec.children", "Children")}</h2>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[var(--text-muted)] font-medium">
              {activePlansCount} {t("rec.active_plans", "active plans")}
            </span>
            {allChildren.length > COLLAPSED_SELECTOR_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllChildren((v) => !v)}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--brand)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] rounded-[4px]"
              >
                <span>
                  {isSelectorExpanded ? "Show fewer" : `Show all (${allChildren.length})`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tidy Responsive Grid: 2 columns on mobile, 3 on sm, 4 on md, 6 on lg */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-0.5"
          role="tablist"
          aria-label="Filter recommendations by child"
        >
          {/* All Children Option */}
          <button
            type="button"
            role="tab"
            aria-selected={selectedChildId === "all"}
            onClick={() => handleSelectChild("all")}
            className={cn(
              "inline-flex items-center justify-between gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-bold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] min-h-[44px]",
              selectedChildId === "all"
                ? "bg-[var(--brand)] text-[#FAF7EF] shadow-[var(--shadow-warm-xs)]"
                : "bg-[var(--card-bg)] text-[var(--text)] border border-[var(--border)] hover:border-[#D8CEBD] hover:bg-[var(--bg-section)]",
            )}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("rec.all_children", "All Children")}</span>
            </div>
            {/* Shows total children count */}
            <span
              className={cn(
                "rounded-[6px] px-1.5 py-0.2 text-[11px] font-bold shrink-0",
                selectedChildId === "all"
                  ? "bg-white/20 text-[#FAF7EF]"
                  : "bg-[var(--bg-section)] text-[var(--text-muted)]",
              )}
            >
              {allChildren.length}
            </span>
          </button>

          {/* Individual Child Compact Filter Items */}
          {visibleChildren.map((ch) => {
            const isObserved = observedChildren.some((c) => c.id === ch.id);
            const isSelected = selectedChildId === ch.id;

            return (
              <button
                key={ch.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectChild(ch.id)}
                className={cn(
                  "inline-flex items-center justify-between gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[13px] font-semibold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] min-h-[44px]",
                  isSelected
                    ? "bg-[var(--brand)] text-[#FAF7EF] shadow-[var(--shadow-warm-xs)]"
                    : "bg-[var(--card-bg)] text-[var(--text)] border border-[var(--border)] hover:border-[#D8CEBD] hover:bg-[var(--bg-section)]",
                )}
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <ChildAvatar child={ch} size="selector" className="shrink-0" />
                  <div className="flex flex-col text-left leading-tight truncate">
                    <span className="font-bold truncate">{ch.name}</span>
                    <span
                      className={cn(
                        "text-[11px]",
                        isSelected ? "text-white/80" : "text-[var(--text-muted)]",
                      )}
                    >
                      {ch.age} {t("rec.yrs", "yrs")}
                    </span>
                  </div>
                </div>

                {/* Status: Small coral dot with text "Pending" ONLY for unobserved children */}
                {!isObserved && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium shrink-0",
                      isSelected ? "text-[#FAF7EF]" : "text-[var(--text)]",
                    )}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[var(--attention)] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="hidden sm:inline">Pending</span>
                  </span>
                )}
              </button>
            );
          })}
          {!isSelectorExpanded && allChildren.length > COLLAPSED_SELECTOR_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllChildren(true)}
              className="inline-flex items-center justify-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[13px] font-semibold min-h-[44px] bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[#D8CEBD] hover:bg-[var(--bg-section)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <span>+{allChildren.length - visibleChildren.length} more</span>
            </button>
          )}
        </div>
      </section>

      {/* =========================================================================
          VIEW MODE 1: ALL CHILDREN OVERVIEW (When "All Children" is selected)
         ========================================================================= */}
      {selectedChildId === "all" ? (
        <main className="space-y-6">
          {isLoadingLogs ? (
            /* Warm Cream Loading Skeletons */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-[12px] border border-[#E2D9C8] bg-[#FFFDF8] p-4 shadow-[0_1px_2px_rgba(25,63,50,0.04)] animate-pulse space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-[#EDE5D8] rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-24 bg-[#EDE5D8] rounded" />
                      <div className="h-3 w-16 bg-[#EDE5D8] rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-32 bg-[#EDE5D8] rounded" />
                  <div className="h-8 w-full bg-[#EDE5D8] rounded-[10px]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Cohesive Header with Inline Count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[20px] font-bold text-[var(--text)]">
                    {t("rec.overview", "Classroom Activity Overview")}
                  </h2>
                  <span className="text-[13px] font-semibold text-[var(--text-muted)]">
                    ({activePlansCount} {t("rec.recommended_count", "recommended")})
                  </span>
                </div>
              </div>

              {/* Recommendation Cards Grid (3 cols >= 1280px, 2 cols 768-1279px, 1 col < 768px) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                {allChildrenOverview.map(
                  ({ child, hasRecs, activeActivity, reason, level, domainId, domainInfo }) => {
                    const DomainIcon = getDomainIcon(domainId);
                    const isPriority = level === 1;
                    const cleanReason = (reason || "").replace(/^["'“]+|["'”]+$/g, "").trim();

                    return (
                      <article
                        key={child.id}
                        className="flex flex-col justify-between rounded-[12px] border border-[#E2D9C8] bg-[var(--card-bg)] p-4 shadow-[0_1px_2px_rgba(25,63,50,0.04)] transition-all duration-150 motion-reduce:transition-none hover:border-[#D5CEBF] hover:shadow-[var(--shadow-warm-sm)]"
                      >
                        <div className="space-y-2.5">
                          {/* 1. Header: Avatar + Child Name, status indicator */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ChildAvatar child={child} size="card" className="shrink-0" />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleSelectChild(child.id)}
                                  className="font-semibold text-[15px] text-[var(--text)] hover:text-[var(--brand)] hover:underline truncate text-left block leading-tight"
                                >
                                  {child.name}
                                </button>
                                <span className="text-[12px] text-[var(--text-muted)]">
                                  {child.age} {t("rec.yrs", "yrs")}
                                </span>
                              </div>
                            </div>

                            {/* Status labels */}
                            {hasRecs ? (
                              <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[var(--text)]">
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                    isPriority ? "bg-[var(--attention)]" : "bg-[#7FA98A]",
                                  )}
                                  aria-hidden="true"
                                />
                                <span>{isPriority ? t("rec.priority", "Priority") : t("rec.developing", "Developing")}</span>
                              </span>
                            ) : (
                              <span className="text-[12px] font-medium text-[var(--text-muted)] shrink-0">
                                {t("rec.mastered", "Mastered")}
                              </span>
                            )}
                          </div>

                          {/* 2. Learning domain: Plain muted text with small icon, NOT a pill */}
                          {hasRecs && activeActivity ? (
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)]">
                                <DomainIcon className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                                <span>{domainId ? getDomainTitle(domainId, lang) : (domainInfo?.name ?? "Learning Activity")}</span>
                              </div>

                              {/* 3. Activity title: The most prominent text in the card */}
                              <h3 className="font-display text-[17px] font-semibold text-[var(--text)] leading-snug line-clamp-1">
                                {translateActivityName(activeActivity.name, lang)}
                              </h3>

                              {/* 4. Meta row: duration and difficulty as plain inline text */}
                              <p className="text-[13px] text-[var(--text-muted)]">
                                {activeActivity.minutes} {t("rec.mins", "mins")} · {activeActivity.difficulty}{" "}
                                difficulty
                              </p>

                              {/* 5. Explanation preview: 14px, #4A564E, 2-line clamp, label above */}
                              <div className="space-y-0.5 pt-0.5">
                                <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                                  {t("rec.why_this", "Why this activity")}
                                </p>
                                <p className="text-[14px] font-normal leading-relaxed text-[#4A564E] line-clamp-2">
                                  {cleanReason}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-[10px] bg-[var(--accent-soft)]/50 p-3 text-[13px] text-[var(--text)] space-y-0.5">
                              <p className="font-semibold text-[var(--brand)] flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>All observed areas on track</span>
                              </p>
                              <p className="text-[12px] text-[var(--text-muted)]">
                                Ready for enrichment or fresh observations.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 6. Footer: Spacing instead of divider, View Plan left-aligned */}
                        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                          {hasRecs && activeActivity ? (
                            <>
                              {/* View Plan (Left-aligned text with no left padding) */}
                              <button
                                type="button"
                                onClick={() => handleSelectChild(child.id)}
                                className="inline-flex min-h-[44px] items-center gap-1 rounded-[10px] pl-0 pr-3 py-2 text-[14px] font-semibold text-[var(--brand)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 transition-colors"
                              >
                                <span>{t("rec.view_plan", "View Plan")}</span>
                                <ChevronRight className="h-4 w-4" />
                              </button>

                              {/* Start (Solid --brand button, prominent) */}
                              <Link
                                to="/activities/$id"
                                params={{ id: activeActivity.id }}
                                search={{ child: child.id }}
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[10px] bg-[var(--brand)] hover:bg-[#122F25] text-[#FAF7EF] px-4 py-2 text-[14px] font-bold shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                              >
                                <span>{t("rec.start", "Start")}</span>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectChild(child.id)}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#E2D9C8] bg-[var(--card-bg)] text-[var(--text)] hover:bg-[var(--bg-section)] px-3 py-2 text-[14px] font-semibold transition-colors"
                            >
                              <span>View Observations</span>
                              <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </div>
          )}

          {/* First Observations Pending (Warm cream section) */}
          {pendingChildren.length > 0 && (
            <section
              aria-label="Children pending initial observations"
              className="rounded-[12px] border border-[#E2D9C8] bg-[var(--bg-section)] p-4 sm:p-5 shadow-[0_1px_2px_rgba(25,63,50,0.04)] space-y-3"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[var(--brand)]" />
                <h3 className="font-display text-[17px] font-bold text-[var(--text)]">
                  First Observations Pending ({pendingChildren.length})
                </h3>
              </div>
              <p className="text-[13px] text-[var(--text-muted)]">
                Record initial classroom observations to unlock personalized activity
                recommendations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {pendingChildren.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between rounded-[10px] border border-[#E2D9C8] bg-[var(--card-bg)] p-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ChildAvatar child={ch} size="card" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-[var(--text)] truncate">
                          {ch.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">{ch.age} yrs old</p>
                      </div>
                    </div>

                    <Link
                      to="/progress"
                      search={{ child: ch.id }}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-[10px] bg-[var(--brand)] px-3 py-1.5 text-[12px] font-semibold text-[#FAF7EF] hover:bg-[#122F25] transition-colors shadow-2xs"
                    >
                      <span>Record</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      ) : (
        /* =========================================================================
            VIEW MODE 2: SINGLE CHILD SPOTLIGHT & PROGRESSIVE DISCLOSURE
           ========================================================================= */
        <main className="space-y-6">
          {/* Child Context Banner with Back Action */}
          {selectedChild && (
            <div className="rounded-[12px] border border-[#E2D9C8] bg-[var(--bg-section)] p-4 sm:p-5 shadow-[0_1px_2px_rgba(25,63,50,0.04)] space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <ChildAvatar child={selectedChild} size="lg" className="shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-[20px] font-bold text-[var(--text)]">
                        {selectedChild.name}
                      </h2>
                      <span className="text-[13px] text-[var(--text-muted)] font-medium">
                        {selectedChild.age} yrs old
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                      {selectedChildContext?.analysis.hasNoObservations
                        ? "First observations pending"
                        : `${selectedChildContext?.analysis.observedDomains.length} of 5 learning areas observed`}
                    </p>
                  </div>
                </div>

                {/* Back to All Children & Profile Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectChild("all")}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#E2D9C8] bg-[var(--card-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--bg-section)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                  >
                    <ChevronLeft className="h-4 w-4 text-[var(--text-muted)]" />
                    <span>All Children</span>
                  </button>

                  <Link
                    to="/children/$id"
                    params={{ id: selectedChild.id }}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-[10px] bg-[var(--brand)] px-3.5 py-2 text-[13px] font-semibold text-[#FAF7EF] hover:bg-[#122F25] transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Observed Domains Compact Badges */}
              {selectedChildContext && !selectedChildContext.analysis.hasNoObservations && (
                <div className="pt-2 border-t border-[var(--border)] flex flex-wrap gap-2 text-[12px]">
                  {DOMAINS.map((d) => {
                    const score = selectedChild.scores[d.id];
                    const isObserved = selectedChildContext.analysis.observedDomains.includes(d.id);
                    const DomainIcon = getDomainIcon(d.id);

                    return (
                      <span
                        key={d.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 font-medium",
                          isObserved
                            ? score === 1
                              ? "bg-[var(--bg-page)] border border-[var(--border)] text-[var(--text)]"
                              : score === 2
                                ? "bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text)]"
                                : "bg-[var(--accent-soft)] text-[var(--brand)]"
                            : "bg-transparent text-[var(--text-muted)] border border-dashed border-[var(--border)]",
                        )}
                      >
                        <DomainIcon className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
                        <span>{d.short}:</span>
                        <strong className="font-bold">
                          {isObserved ? `L${score}` : "Pending"}
                        </strong>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recommendations for Selected Child */}
          {singleChildRecs.length > 0 ? (
            <div className="space-y-6">
              {singleChildRecs.map(({ recommendation: r }) => {
                // Completed activities filter
                const childCompletedIds = new Set(
                  logs
                    .filter((l) => l.childId === r.child.id && isCompletedTrial(l.outcome))
                    .map((l) => l.activityId),
                );

                // AI resolved recommendation item
                const aiItem =
                  aiRecsMap[`${r.child.id}:${r.domain}`] ||
                  aiRecsMap[`${r.child.id}:${r.activity.id}`];

                const activeActivity =
                  (aiItem?.activityId &&
                    !childCompletedIds.has(aiItem.activityId) &&
                    ACTIVITIES.find((a) => a.id === aiItem.activityId)) ||
                  r.activity;

                const d = domainOf(activeActivity.domain || r.domain);
                const DomainIcon = getDomainIcon(activeActivity.domain || r.domain);

                const cardKey = `${r.child.id}-${activeActivity.id}`;
                const status = inlineStatus[cardKey];
                const isSaving = savingKey === cardKey;

                // Priority indicator: Level 1 is Practice Priority
                const isPrimaryFocus = r.level === 1;

                // Section toggle keys
                const secWhy = `${cardKey}-why`;
                const secObs = `${cardKey}-obs`;
                const secApproach = `${cardKey}-approach`;
                const secTrials = `${cardKey}-trials`;
                const secSteps = `${cardKey}-steps`;

                const cleanReason = (aiItem?.reason || r.reason || "")
                  .replace(/^["'“]+|["'”]+$/g, "")
                  .trim();

                return (
                  <article
                    key={cardKey}
                    className="rounded-[12px] border border-[#E2D9C8] bg-[var(--card-bg)] shadow-[0_1px_2px_rgba(25,63,50,0.04)] overflow-hidden"
                  >
                    {/* Recommendation Overview Spotlight */}
                    <div className="p-5 sm:p-6 space-y-4">
                      {/* Top Meta Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* Learning domain plain text */}
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)]">
                            <DomainIcon className="h-4 w-4 text-[var(--brand)]" />
                            <span>{d?.name ?? r.domain}</span>
                          </div>

                          {/* Status labels */}
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text)]">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isPrimaryFocus ? "bg-[var(--attention)]" : "bg-[#7FA98A]",
                              )}
                            />
                            <span>{isPrimaryFocus ? "Priority" : "Developing"}</span>
                          </span>
                        </div>

                        {/* Pedagogical Source Tag */}
                        {aiItem?.isAiGenerated ? (
                          <span className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--accent-soft)] px-2 py-0.5 text-[12px] font-medium text-[var(--brand)]">
                            <Sparkles className="h-3 w-3" />
                            <span>Personalized Strategy</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--bg-section)] px-2 py-0.5 text-[12px] font-medium text-[var(--text-muted)]">
                            <Layers className="h-3 w-3" />
                            <span>Curriculum Matched</span>
                          </span>
                        )}
                      </div>

                      {/* Main Activity Spotlight Hero */}
                      <div className="rounded-[12px] border border-[#E2D9C8] bg-[var(--bg-section)]/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                            <span>{activeActivity.minutes} {t("rec.mins", "mins")}</span>
                            <span>•</span>
                            <span className="capitalize">
                              {activeActivity.difficulty} difficulty
                            </span>
                          </div>

                          <h3 className="font-display text-[22px] sm:text-[24px] font-bold text-[var(--text)] leading-tight">
                            {activeActivity.name}
                          </h3>

                          {/* Regular weight reason, no quotes */}
                          <p className="text-[14px] font-normal text-[var(--text)] max-w-xl leading-relaxed">
                            {cleanReason}
                          </p>
                        </div>

                        {/* Prominent Start Activity Button */}
                        <Link
                          to="/activities/$id"
                          params={{ id: activeActivity.id }}
                          search={{ child: r.child.id }}
                          className="inline-flex shrink-0 min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[var(--brand)] hover:bg-[#122F25] text-[#FAF7EF] px-5 py-2.5 text-[14px] font-bold shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                        >
                          <span>Start Activity</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Progressive Disclosure Accordions */}
                    <div className="border-t border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--bg-page)]/40">
                      {/* Section 1: Why this activity? */}
                      <div>
                        <button
                          type="button"
                          aria-expanded={Boolean(openSections[secWhy])}
                          onClick={() => toggleSection(secWhy)}
                          className="w-full flex items-center justify-between p-4 text-left text-[13px] font-bold text-[var(--text)] hover:bg-[var(--bg-section)]/50 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                            <span>1. Why this activity?</span>
                          </span>
                          {openSections[secWhy] ? (
                            <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                          )}
                        </button>

                        {openSections[secWhy] && (
                          <div className="px-4 pb-4 space-y-3 text-[13px]">
                            <p className="border-l-[3px] border-[var(--brand)] pl-3 py-1 font-normal text-[var(--text)] leading-relaxed">
                              {cleanReason}
                            </p>

                            {/* Target Focus Skills */}
                            {aiItem?.focusSkills && aiItem.focusSkills.length > 0 && (
                              <div className="pt-1">
                                <p className="text-[12px] font-semibold text-[var(--text-muted)] mb-1.5">
                                  Target Skills:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {aiItem.focusSkills.map((sk, idx) => (
                                    <span
                                      key={idx}
                                      className="rounded-[6px] border border-[var(--border)] bg-[var(--card-bg)] px-2 py-0.5 text-[12px] text-[var(--text)]"
                                    >
                                      {sk}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Classroom Observations */}
                      <div>
                        <button
                          type="button"
                          aria-expanded={Boolean(openSections[secObs])}
                          onClick={() => toggleSection(secObs)}
                          className="w-full flex items-center justify-between p-4 text-left text-[13px] font-bold text-[var(--text)] hover:bg-[var(--bg-section)]/50 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[var(--brand)]" />
                            <span>2. Classroom observations</span>
                          </span>
                          {openSections[secObs] ? (
                            <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                          )}
                        </button>

                        {openSections[secObs] && (
                          <div className="px-4 pb-4 space-y-3 text-[13px]">
                            {(aiItem?.evidence?.length ? aiItem.evidence : r.evidence).length >
                            0 ? (
                              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] p-3 text-[13px] text-[var(--text)] space-y-1.5">
                                <p className="font-semibold text-[12px] text-[var(--text-muted)]">
                                  Recorded Observation Notes:
                                </p>
                                <ul className="space-y-1">
                                  {(aiItem?.evidence?.length ? aiItem.evidence : r.evidence).map(
                                    (ev, idx) => (
                                      <li key={idx} className="text-[var(--text)]">
                                        • {ev.replace(/^["'“]+|["'”]+$/g, "").trim()}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            ) : (
                              <p className="text-[13px] text-[var(--text-muted)] italic">
                                Observation pending for this specific activity domain.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Section 3: Teacher Approach */}
                      <div>
                        <button
                          type="button"
                          aria-expanded={Boolean(openSections[secApproach])}
                          onClick={() => toggleSection(secApproach)}
                          className="w-full flex items-center justify-between p-4 text-left text-[13px] font-bold text-[var(--text)] hover:bg-[var(--bg-section)]/50 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-[var(--brand)]" />
                            <span>3. Teacher approach & scaffolding</span>
                          </span>
                          {openSections[secApproach] ? (
                            <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                          )}
                        </button>

                        {openSections[secApproach] && (
                          <div className="px-4 pb-4 space-y-3 text-[13px]">
                            {/* Strategy */}
                            {aiItem?.teachingStrategy ? (
                              <div className="rounded-[10px] border border-[#DCE9DD] bg-[var(--accent-soft)]/50 p-3 text-[13px]">
                                <p className="font-bold text-[var(--brand)] text-[12px] mb-1">
                                  Practical Teaching Strategy:
                                </p>
                                <p className="leading-relaxed text-[var(--text)] font-medium">
                                  {aiItem.teachingStrategy}
                                </p>
                              </div>
                            ) : null}

                            {/* Scaffolding adaptation */}
                            {(r.scaffoldingNote || aiItem?.nextStepIfSupportNeeded) && (
                              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[13px]">
                                <p className="font-bold text-[var(--brand)] text-[12px] mb-1">
                                  Gentle Scaffolding Adaptation:
                                </p>
                                <p className="leading-relaxed text-[var(--text)] font-medium">
                                  {r.scaffoldingNote || aiItem?.nextStepIfSupportNeeded}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Section 4: Previous Attempts & Trial Logger */}
                      <div>
                        <button
                          type="button"
                          aria-expanded={Boolean(openSections[secTrials])}
                          onClick={() => toggleSection(secTrials)}
                          className="w-full flex items-center justify-between p-4 text-left text-[13px] font-bold text-[var(--text)] hover:bg-[var(--bg-section)]/50 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[var(--brand)]" />
                            <span>4. Previous attempts & log outcome</span>
                          </span>
                          {openSections[secTrials] ? (
                            <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                          )}
                        </button>

                        {openSections[secTrials] && (
                          <div className="px-4 pb-4 space-y-3.5 text-[13px]">
                            {/* Previous Trial Record */}
                            {r.lastTrial ? (
                              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] p-3 text-[13px] text-[var(--text)]">
                                <span className="font-semibold text-[var(--text)]">
                                  Last trial on{" "}
                                  {r.lastTrial.date
                                    ? new Date(r.lastTrial.date).toLocaleDateString()
                                    : "earlier session"}
                                  :
                                </span>{" "}
                                <span className="font-bold text-[var(--brand)]">
                                  {formatOutcomeLabel(r.lastTrial.outcome)}
                                </span>
                                {r.lastTrial.note && (
                                  <p className="mt-1 text-[var(--text)]">
                                    "{r.lastTrial.note.replace(/^["'“]+|["'”]+$/g, "").trim()}"
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[var(--text-muted)] italic">
                                No prior trials recorded for this activity yet.
                              </p>
                            )}

                            {/* Session Outcome Logger */}
                            <div className="pt-2">
                              <p className="text-[12px] font-bold text-[var(--text)] mb-2">
                                Record Session Outcome:
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
                                  className="inline-flex items-center justify-center gap-1 rounded-[10px] border border-[#C5D9C8] bg-[var(--accent-soft)] hover:bg-[#CCE0CE] px-2 py-2 text-[12px] font-semibold text-[var(--brand)] transition-colors disabled:opacity-50 min-h-[44px] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  <span>Tried — Helped</span>
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
                                  className="inline-flex items-center justify-center gap-1 rounded-[10px] border border-[#EADBCA] bg-[#FAF3E8] hover:bg-[#F3E9DD] px-2 py-2 text-[12px] font-semibold text-[#8C5E24] transition-colors disabled:opacity-50 min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#8C5E24]"
                                >
                                  <Compass className="h-3.5 w-3.5 shrink-0" />
                                  <span>Needs Support</span>
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
                                  className="inline-flex items-center justify-center gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--bg-section)] px-2 py-2 text-[12px] font-semibold text-[var(--text-muted)] transition-colors disabled:opacity-50 min-h-[44px] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                                >
                                  <Clock className="h-3.5 w-3.5 shrink-0" />
                                  <span>Not Tried</span>
                                </button>
                              </div>

                              {/* Pure White input for contrast */}
                              <input
                                type="text"
                                placeholder="Optional classroom observation note..."
                                value={activeNotes[cardKey] || ""}
                                onChange={(e) =>
                                  setActiveNotes((prev) => ({ ...prev, [cardKey]: e.target.value }))
                                }
                                className="mt-2.5 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] transition-colors"
                              />

                              {/* Save feedback alert */}
                              {status && (
                                <div
                                  role="status"
                                  className={cn(
                                    "mt-2.5 flex items-center gap-2 rounded-[10px] p-2.5 text-[12px] font-medium",
                                    status.type === "error"
                                      ? "border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text)]"
                                      : "border border-[#C5D9C8] bg-[var(--accent-soft)] text-[var(--brand)]",
                                  )}
                                >
                                  {status.type === "error" ? (
                                    <AlertCircle className="h-4 w-4 shrink-0 text-[var(--attention)]" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                                  )}
                                  <span>
                                    {status.type === "error"
                                      ? `Could not save: ${status.message}.`
                                      : status.message}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section 5: Activity Instructions */}
                      <div>
                        <button
                          type="button"
                          aria-expanded={Boolean(openSections[secSteps])}
                          onClick={() => toggleSection(secSteps)}
                          className="w-full flex items-center justify-between p-4 text-left text-[13px] font-bold text-[var(--text)] hover:bg-[var(--bg-section)]/50 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-[var(--brand)]" />
                            <span>
                              5. Activity instructions (
                              {
                                (aiItem?.teacherSteps?.length
                                  ? aiItem.teacherSteps
                                  : activeActivity.steps
                                ).length
                              }{" "}
                              steps)
                            </span>
                          </span>
                          {openSections[secSteps] ? (
                            <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                          )}
                        </button>

                        {openSections[secSteps] && (
                          <div className="px-4 pb-4 space-y-3.5 text-[13px]">
                            {/* Numbered steps */}
                            <ol className="space-y-2">
                              {(aiItem?.teacherSteps?.length
                                ? aiItem.teacherSteps
                                : activeActivity.steps
                              ).map((step, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2.5 text-[var(--text)]"
                                >
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--brand)]">
                                    {idx + 1}
                                  </span>
                                  <span className="leading-relaxed">{step}</span>
                                </li>
                              ))}
                            </ol>

                            {/* Observable success measure */}
                            {aiItem?.successCriteria && (
                              <div className="rounded-[10px] border border-[#DCE9DD] bg-[var(--accent-soft)]/50 p-2.5">
                                <p className="flex items-center gap-1 font-bold text-[var(--brand)] text-[12px] mb-0.5">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Observable Success Measure:</span>
                                </p>
                                <p className="text-[var(--text)] leading-relaxed">
                                  {aiItem.successCriteria}
                                </p>
                              </div>
                            )}

                            {/* Next Steps Guidance */}
                            {(aiItem?.nextStepIfSuccessful || aiItem?.nextStepIfSupportNeeded) && (
                              <div className="grid gap-2 sm:grid-cols-2 pt-1">
                                {aiItem.nextStepIfSuccessful && (
                                  <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] p-2.5">
                                    <p className="flex items-center gap-1 font-bold text-[var(--brand)] text-[11px]">
                                      <TrendingUp className="h-3 w-3" />
                                      <span>If mastered:</span>
                                    </p>
                                    <p className="mt-0.5 text-[var(--text-muted)] text-[12px] leading-tight">
                                      {aiItem.nextStepIfSuccessful}
                                    </p>
                                  </div>
                                )}
                                {aiItem?.nextStepIfSupportNeeded && (
                                  <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-section)] p-2.5">
                                    <p className="flex items-center gap-1 font-bold text-[var(--text)] text-[11px]">
                                      <Lightbulb className="h-3 w-3" />
                                      <span>If needing support:</span>
                                    </p>
                                    <p className="mt-0.5 text-[var(--text-muted)] text-[12px] leading-tight">
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
                  </article>
                );
              })}
            </div>
          ) : (
            /* Selected Child Has Mastered All Observed Domains */
            <div className="rounded-[12px] border border-[#E2D9C8] bg-[var(--card-bg)] p-8 text-center shadow-[0_1px_2px_rgba(25,63,50,0.04)] space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--brand)]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="font-display text-[20px] font-bold text-[var(--text)]">
                {selectedChild?.name} is progressing well in all observed areas
              </h2>
              <p className="max-w-md mx-auto text-[14px] text-[var(--text-muted)] leading-relaxed">
                Every assessed area currently demonstrates mastery (Level 3). You can explore
                enrichment activities from the activity library or record observations in other
                learning domains.
              </p>
              <div className="pt-2">
                <Link
                  to="/activities"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[#FAF7EF] hover:bg-[#122F25] transition-colors shadow-xs"
                >
                  <span>Browse Activity Library</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
          {selectedChildId !== "all" && (
            <p className="text-[12px] text-[var(--text-muted)] text-center">
              Suggestions are grounded in classroom observations to support planning, not formal
              developmental diagnoses.
            </p>
          )}
        </main>
      )}
    </div>
  );
}
