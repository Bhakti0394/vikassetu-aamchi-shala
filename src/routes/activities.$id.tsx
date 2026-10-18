import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  User,
} from "lucide-react";
import { activityOf, domainOf, toneBg } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import {
  saveActivityLog,
  queuePendingTrial,
  fetchChildActivityHistory,
  syncPendingTrials,
  type ActivityLogOutcome,
  type ActivityLogRecord,
  type QueuedActivityTrial,
} from "@/lib/activityLogs";

export const Route = createFileRoute("/activities/$id")({
  validateSearch: (s: Record<string, unknown>): { child?: string } =>
    typeof s["child"] === "string" ? { child: s["child"] as string } : {},
  head: () => ({
    meta: [
      { title: "Activity guide — VikasSetu" },
      { name: "description", content: "Step-by-step guide for a playgroup learning activity." },
      { property: "og:title", content: "Activity guide — VikasSetu" },
      {
        property: "og:description",
        content: "Step-by-step guide for a playgroup learning activity.",
      },
    ],
  }),
  component: ActivityRun,
});

function formatOutcomeLabel(outcome: ActivityLogOutcome): string {
  switch (outcome) {
    case "tried_helped":
      return "Tried — Helped";
    case "tried_needs_support":
      return "Tried — Needs Support";
    case "not_tried":
      return "Not Tried";
  }
}

function ActivityRun() {
  const { id } = Route.useParams();
  const { child: initialChildId } = Route.useSearch();
  const { children } = useStore();
  const a = activityOf(id);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    initialChildId || children[0]?.id || "",
  );
  const [done, setDone] = useState<number[]>([]);
  const [note, setNote] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "queued" | "error";
    message: string;
  } | null>(null);

  const [childHistory, setChildHistory] = useState<{
    confirmed: ActivityLogRecord[];
    queued: QueuedActivityTrial[];
  }>({ confirmed: [], queued: [] });

  const selectedChild = children.find((c) => c.id === selectedChildId);

  // Load trial history whenever selected child or activity changes
  useEffect(() => {
    if (!selectedChildId || !a) return;
    let isMounted = true;

    fetchChildActivityHistory(selectedChildId).then((res) => {
      if (isMounted) {
        setChildHistory({
          confirmed: res.confirmed.filter((l) => l.activityId === a.id),
          queued: res.queued.filter((l) => l.activityId === a.id),
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedChildId, a?.id]);

  if (!a) return <p className="p-8 text-center text-muted-foreground">Activity not found.</p>;
  const d = domainOf(a.domain);
  const allDone = done.length === a.steps.length;
  const completedSteps = done.length;
  const totalSteps = a.steps.length;

  const handleRecordOutcome = async (outcome: ActivityLogOutcome) => {
    if (!selectedChildId) return;

    setIsSaving(true);
    setStatusMessage(null);

    const payload = {
      childId: selectedChildId,
      activityId: a.id,
      completedSteps: Math.min(completedSteps, totalSteps),
      totalSteps,
      outcome,
      note: note.trim() || undefined,
    };

    const res = await saveActivityLog(payload);
    setIsSaving(false);

    if (res.success && res.data) {
      setStatusMessage({
        type: "success",
        message: `Saved trial: "${formatOutcomeLabel(outcome)}" (${completedSteps}/${totalSteps} steps completed)`,
      });
      setChildHistory((prev) => ({
        ...prev,
        confirmed: [res.data!, ...prev.confirmed],
      }));
      setNote("");
    } else {
      // Offline fallback: save in-memory only and clearly flag as queued
      const queuedItem = queuePendingTrial(payload, res.error);
      setStatusMessage({
        type: "queued",
        message:
          "Saved to session queue (offline — will sync when backend reconnects). NOTE: Memory-only; not persisted across reloads.",
      });
      setChildHistory((prev) => ({
        ...prev,
        queued: [queuedItem, ...prev.queued],
      }));
      setNote("");
    }
  };

  const handleManualSync = async () => {
    const res = await syncPendingTrials();
    if (res.syncedCount > 0) {
      setStatusMessage({
        type: "success",
        message: `Synced ${res.syncedCount} queued trial(s) successfully with backend!`,
      });
      // Refresh history
      if (selectedChildId) {
        const refreshed = await fetchChildActivityHistory(selectedChildId);
        setChildHistory({
          confirmed: refreshed.confirmed.filter((l) => l.activityId === a.id),
          queued: refreshed.queued.filter((l) => l.activityId === a.id),
        });
      }
    } else if (res.errors.length > 0) {
      setStatusMessage({
        type: "queued",
        message: `Sync failed: ${res.errors[0]}. Item remains queued in memory.`,
      });
    }
  };

  const totalTrials = childHistory.confirmed.length + childHistory.queued.length;

  return (
    <div className="fade-up mx-auto max-w-2xl space-y-6">
      <Link
        to="/activities"
        className="inline-flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Activities
      </Link>

      {/* Header section with Activity Details */}
      <section className={cn("rounded-3xl p-8 text-center", d ? toneBg[d.tone] : "bg-muted")}>
        <div className="text-7xl">{a.emoji}</div>
        <p className="mt-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {d?.name ?? a.domain}
        </p>
        <h1 className="text-4xl font-bold">{a.name}</h1>
        <p className="mt-2 flex items-center justify-center gap-1 font-semibold text-muted-foreground">
          <Clock className="h-4 w-4" /> {a.minutes} min · {a.difficulty}
        </p>

        {/* Child Selector */}
        <div className="mx-auto mt-5 flex max-w-sm flex-wrap items-center justify-center gap-2 rounded-2xl bg-card/90 p-2 shadow-soft">
          <div className="flex items-center gap-2 px-2">
            {selectedChild ? <Avatar child={selectedChild} size="sm" /> : <User className="h-5 w-5" />}
            <span className="text-xs font-bold text-muted-foreground">Child:</span>
          </div>
          <select
            value={selectedChildId}
            onChange={(e) => {
              setSelectedChildId(e.target.value);
              setStatusMessage(null);
            }}
            className="rounded-xl border border-border/70 bg-background px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.age} yrs)
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Step by Step Checklist */}
      <section className="card-soft p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Steps — tap each when done</h2>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            {completedSteps} / {totalSteps} completed
          </span>
        </div>

        <ol className="space-y-3 stagger">
          {a.steps.map((s, i) => {
            const on = done.includes(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setDone(on ? done.filter((x) => x !== i) : [...done, i])}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
                    on ? "border-primary bg-primary-soft" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold",
                      on ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {on ? <Check className="h-5 w-5" /> : i + 1}
                  </span>
                  <span className={cn("font-semibold", on && "text-muted-foreground line-through")}>
                    {s}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="text-sm font-bold text-muted-foreground">Skills:</span>
          {a.skills.map((s) => (
            <span key={s} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Outcome Logging Section */}
      <section className="card-soft p-6">
        <h2 className="mb-2 text-xl font-bold">
          Log Outcome {selectedChild ? `with ${selectedChild.name}` : ""}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Step count will record: <strong>{completedSteps} of {totalSteps} steps completed</strong>.
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <button
            type="button"
            disabled={isSaving || !selectedChildId}
            onClick={() => handleRecordOutcome("tried_helped")}
            className="rounded-xl border border-teal/40 bg-teal-soft px-3 py-2.5 text-center text-sm font-bold text-teal transition hover:opacity-90 disabled:opacity-50"
          >
            Tried — Helped
          </button>

          <button
            type="button"
            disabled={isSaving || !selectedChildId}
            onClick={() => handleRecordOutcome("tried_needs_support")}
            className="rounded-xl border border-sun/40 bg-sun-soft px-3 py-2.5 text-center text-sm font-bold text-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Tried — Needs Support
          </button>

          <button
            type="button"
            disabled={isSaving || !selectedChildId}
            onClick={() => handleRecordOutcome("not_tried")}
            className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-center text-sm font-bold text-muted-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Not Tried
          </button>
        </div>

        {/* Observation Note */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Optional classroom trial notes (e.g. child needed help with step 2)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Feedback / Status message */}
        {statusMessage && (
          <div
            className={cn(
              "mt-3 flex items-center justify-between gap-2 rounded-xl p-3 text-xs font-semibold",
              statusMessage.type === "success"
                ? "border border-teal/30 bg-teal-soft text-teal"
                : statusMessage.type === "queued"
                  ? "border border-sun/40 bg-sun-soft text-foreground"
                  : "border border-coral/30 bg-coral-soft text-coral",
            )}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
              ) : statusMessage.type === "queued" ? (
                <CloudUpload className="h-4 w-4 shrink-0 text-sun-foreground" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-coral" />
              )}
              <span>{statusMessage.message}</span>
            </div>

            {statusMessage.type === "queued" && (
              <button
                type="button"
                onClick={handleManualSync}
                className="shrink-0 rounded-lg bg-foreground/10 px-2 py-1 text-xs font-bold hover:bg-foreground/20"
              >
                Sync Now
              </button>
            )}
          </div>
        )}
      </section>

      {/* Previous Trials History with Selected Child */}
      {selectedChild && totalTrials > 0 && (
        <section className="card-soft p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">
              Previous trials with {selectedChild.name} ({totalTrials})
            </h3>
            {childHistory.queued.length > 0 && (
              <button
                type="button"
                onClick={handleManualSync}
                className="flex items-center gap-1 rounded-xl bg-sun-soft px-2.5 py-1 text-xs font-bold text-foreground hover:opacity-90"
              >
                <CloudUpload className="h-3.5 w-3.5" />
                Sync {childHistory.queued.length} Pending
              </button>
            )}
          </div>

          <ul className="space-y-2.5">
            {/* Queued (In-memory pending) trials first */}
            {childHistory.queued.map((q) => (
              <li
                key={q.queueId}
                className="flex flex-col gap-1 rounded-xl border border-sun/30 bg-sun-soft/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-sun/40 px-2 py-0.5 text-xs font-bold text-foreground">
                      {formatOutcomeLabel(q.outcome)}
                    </span>
                    <span className="text-xs font-bold text-sun-foreground">
                      ⚠️ Session Queue (Pending Sync)
                    </span>
                  </div>
                  {q.note && <p className="mt-1 text-xs text-muted-foreground">"{q.note}"</p>}
                </div>
                <div className="text-right text-xs font-medium text-muted-foreground">
                  <span>
                    {q.completedSteps}/{q.totalSteps} steps
                  </span>{" "}
                  · Just now
                </div>
              </li>
            ))}

            {/* Confirmed backend records */}
            {childHistory.confirmed.map((l) => (
              <li
                key={l.id}
                className="flex flex-col gap-1 rounded-xl bg-muted/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-bold",
                        l.outcome === "tried_helped"
                          ? "bg-teal-soft text-teal"
                          : l.outcome === "tried_needs_support"
                            ? "bg-sun-soft text-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {formatOutcomeLabel(l.outcome)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      ✓ Confirmed
                    </span>
                  </div>
                  {l.note && <p className="mt-1 text-xs text-foreground">"{l.note}"</p>}
                </div>
                <div className="text-right text-xs font-medium text-muted-foreground">
                  <span>
                    {l.completedSteps}/{l.totalSteps} steps
                  </span>{" "}
                  ·{" "}
                  {new Date(l.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Observational Progress Form Link */}
      <Link
        to="/progress"
        search={{
          ...(selectedChildId ? { child: selectedChildId } : {}),
          domain: a.domain,
          activity: a.id,
        }}
        className={cn("btn w-full py-4 text-lg", allDone ? "btn-primary" : "btn-sun")}
      >
        {allDone ? "All Steps Done! Record Observation →" : "Finish & Record Observation →"}
      </Link>
    </div>
  );
}
