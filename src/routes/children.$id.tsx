import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  PenLine,
  CheckCircle2,
  HeartHandshake,
  CloudUpload,
} from "lucide-react";
import { useStore, isPresentToday, attendancePct } from "@/lib/store";
import { activityOf, domainOf, toneBg } from "@/lib/data";
import { recommendFor, type ActivityLogSummary } from "@/lib/recommend";
import {
  fetchChildActivityHistory,
  syncPendingTrials,
  type ChildActivityHistoryItem,
} from "@/lib/activityLogs";
import { Avatar, DomainBars, DomainChip, ScoreBadge, StartButton } from "@/components/ui-kit";
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
  const ch = children.find((c) => c.id === id);

  const [trials, setTrials] = useState<ChildActivityHistoryItem[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadTrials = async () => {
    if (!ch?.id) return;
    setIsLoadingTrials(true);
    try {
      const res = await fetchChildActivityHistory(ch.id);
      setTrials(res.all);
    } catch {
      setTrials([]);
    } finally {
      setIsLoadingTrials(false);
    }
  };

  useEffect(() => {
    if (ch?.id) {
      loadTrials();
    }
  }, [ch?.id]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncPendingTrials();
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

  if (!ch)
    return (
      <div className="py-20 text-center">
        <p>Child not found.</p>
        <Link to="/children" className="btn btn-primary mt-4">
          Back
        </Link>
      </div>
    );

  const activitySummaries: ActivityLogSummary[] = trials.map((t) => {
    if (t.type === "confirmed") {
      return {
        childId: t.record.childId,
        activityId: t.record.activityId,
        outcome: t.record.outcome,
        note: t.record.note,
        createdAt: t.record.createdAt,
      };
    } else {
      return {
        childId: t.queued.childId,
        activityId: t.queued.activityId,
        outcome: t.queued.outcome,
        note: t.queued.note,
        createdAt: t.queued.queuedAt,
      };
    }
  });

  const obs = observations.filter((o) => o.childId === ch.id);
  const recs = recommendFor(ch, obs, activitySummaries);
  const present = isPresentToday(attendance, ch.id);
  const hasQueued = trials.some((t) => t.type === "queued");

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
        <h2 className="mb-4 text-2xl font-bold">Recommended Activities</h2>
        {recs.length === 0 ? (
          <p className="card-soft p-6 text-muted-foreground">
            🎉 {ch.name} is doing well in every area. Keep exploring!
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 stagger">
            {recs.map((r) => {
              const dom = domainOf(r.domain);
              return (
                <div key={r.domain} className="card-soft p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl text-3xl",
                        dom ? toneBg[dom.tone] : "bg-muted",
                      )}
                    >
                      {r.activity.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-xl font-bold">{r.activity.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {r.activity.minutes} min · {r.activity.difficulty}
                      </p>
                    </div>
                  </div>
                  <blockquote className="my-4 border-l-4 border-sun bg-sun-soft/60 px-4 py-2 text-sm font-semibold">
                    "{r.reason}"
                  </blockquote>
                  <StartButton activityId={r.activity.id} childId={ch.id} />
                </div>
              );
            })}
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
          {hasQueued && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="btn btn-outline self-start text-xs py-1.5 px-3 flex items-center gap-1.5 border-sun text-foreground hover:bg-sun-soft sm:self-auto"
            >
              <CloudUpload className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync now"}
            </button>
          )}
        </div>

        {syncMessage && (
          <div className="mb-4 rounded-xl bg-sun-soft px-4 py-2.5 text-xs font-semibold text-foreground">
            {syncMessage}
          </div>
        )}

        {isLoadingTrials ? (
          <p className="text-sm text-muted-foreground">Loading activity history...</p>
        ) : trials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-muted-foreground">
            <p className="font-semibold">No activity trials recorded yet for {ch.name}.</p>
            <p className="mt-1 text-xs">
              Start an activity from the recommendations above to record steps and trial outcomes.
            </p>
          </div>
        ) : (
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
                          <span className="rounded-md bg-sun-soft px-2 py-0.5 text-xs font-bold text-sun-foreground">
                            ⚠️ Pending sync
                          </span>
                        )}
                      </div>
                      {itemData.note && (
                        <p className="mt-1 text-xs italic text-foreground/80">
                          "{itemData.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-1 text-xs text-muted-foreground sm:flex-col sm:items-end">
                    <span>
                      {new Date(itemData.date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {isQueued ? (
                      <span className="text-xs font-semibold text-sun-foreground">
                        Session queue
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-teal">✓ Confirmed</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
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
