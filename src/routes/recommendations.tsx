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
} from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { DOMAINS, domainOf, toneBg } from "@/lib/data";
import { Avatar, PageHeader, StartButton } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { recommendFor, analyseChild, type Recommendation } from "@/lib/recommend";
import {
  fetchActivityLogs,
  saveActivityLog,
  type ActivityLogOutcome,
  type ActivityLogRecord,
} from "@/lib/activityLogs";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations — VikasSetu" },
      {
        name: "description",
        content:
          "Personalised activity suggestions for each child, with the reason behind every recommendation.",
      },
      { property: "og:title", content: "Recommendations — VikasSetu" },
      {
        property: "og:description",
        content:
          "Personalised activity suggestions for each child, with the reason behind every recommendation.",
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
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [inlineStatus, setInlineStatus] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    fetchActivityLogs().then((res) => {
      if (mounted && res.success) {
        setLogs(res.data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Separate children into observed vs first observations pending
  const observedChildren = children.filter((c) => !analyseChild(c, observations).hasNoObservations);
  const pendingChildren = children.filter((c) => analyseChild(c, observations).hasNoObservations);

  // Generate recommendations
  const recs: { recommendation: Recommendation; unobservedDomains: string[] }[] = [];
  for (const child of observedChildren) {
    const analysis = analyseChild(child, observations);
    const childRecs = recommendFor(child, observations, logs);
    const unobserved = DOMAINS.filter((d) => !analysis.observedDomains.includes(d.id)).map(
      (d) => d.name,
    );

    for (const r of childRecs) {
      recs.push({ recommendation: r, unobservedDomains: unobserved });
    }
  }

  // Sort: level 1 first, then level 2
  recs.sort((a, b) => a.recommendation.level - b.recommendation.level);

  const handleRecordOutcome = async (
    childId: string,
    activityId: string,
    totalSteps: number,
    outcome: ActivityLogOutcome,
  ) => {
    const key = `${childId}-${activityId}`;
    setSavingKey(key);
    const note = activeNotes[key]?.trim();

    const res = await saveActivityLog({
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
    });

    setSavingKey(null);

    if (res.success && res.data) {
      setLogs((prev) => [res.data!, ...prev]);
      setInlineStatus((prev) => ({
        ...prev,
        [key]: {
          type: "success",
          message: `Saved outcome: "${formatOutcomeLabel(outcome)}"`,
        },
      }));
      // Clear notes after save
      setActiveNotes((prev) => ({ ...prev, [key]: "" }));
    } else {
      // Surface failure inline without crashing page
      setInlineStatus((prev) => ({
        ...prev,
        [key]: {
          type: "error",
          message: res.error || "Backend unavailable",
        },
      }));
    }
  };

  return (
    <div className="fade-up space-y-8">
      <PageHeader
        eyebrow="Recommended for you"
        title="Recommendations"
        subtitle="Every suggestion comes from what you observed. Here's why each activity was chosen."
      />

      {/* Process summary banner */}
      <div className="card-soft mb-8 grid gap-3 p-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        {[
          { icon: Eye, t: "Observation", d: "You record a 1–3 score", c: "bg-teal-soft text-teal" },
          {
            icon: Target,
            t: "Learning Gap",
            d: "Lowest area is found",
            c: "bg-coral-soft text-coral",
          },
          {
            icon: Sparkles,
            t: "Recommendation",
            d: "Matching activity suggested",
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
        {recs.map(({ recommendation: r, unobservedDomains }) => {
          const d = domainOf(r.domain);
          const cardKey = `${r.child.id}-${r.activity.id}`;
          const status = inlineStatus[cardKey];
          const isSaving = savingKey === cardKey;

          return (
            <div key={cardKey} className="card-soft overflow-hidden">
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
                        {r.child.age} years old · {d.name}
                      </p>
                    </div>
                  </div>

                  {/* Early Suggestion Badge */}
                  {r.isEarlySuggestion && (
                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sun-soft px-3 py-1 text-xs font-bold text-sun-foreground">
                      <Zap className="h-3.5 w-3.5" />
                      <span>⚡ Early Suggestion (Initial Observation)</span>
                    </div>
                  )}

                  {/* Unobserved notes */}
                  {unobservedDomains.length > 0 && (
                    <div className="mt-4 rounded-xl bg-muted/60 p-3 text-xs">
                      <p className="font-bold text-muted-foreground">Unobserved areas:</p>
                      <p className="mt-0.5 text-muted-foreground">{unobservedDomains.join(", ")}</p>
                    </div>
                  )}
                </div>

                {/* Evidence & Pedagogical Reason Column */}
                <div className="border-b p-5 lg:col-span-4 lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-coral">
                      Learning Gap
                    </p>
                    <span className="rounded-lg bg-coral-soft px-2 py-0.5 text-xs font-bold text-coral">
                      Level {r.level}/3
                    </span>
                  </div>

                  <p className="mt-1 font-display text-lg font-bold">
                    {d.emoji} {d.name}
                  </p>

                  {/* Reason Display */}
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Why this activity?
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">
                      "{r.reason}"
                    </p>
                  </div>

                  {/* Evidence Display */}
                  {r.evidence.length > 0 && (
                    <div className="mt-4 rounded-xl border border-muted bg-muted/40 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Evidence from classroom:
                      </p>
                      <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                        {r.evidence.slice(0, 2).map((ev) => (
                          <li key={ev} className="italic">
                            "{ev}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Activity & Interactive Outcome Column */}
                <div
                  className={cn("flex flex-col justify-between p-5 lg:col-span-5", toneBg[d.tone])}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-xl font-bold">
                          {r.activity.emoji} {r.activity.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.activity.minutes} min · {r.activity.difficulty}
                        </p>
                      </div>
                      <StartButton activityId={r.activity.id} childId={r.child.id} />
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

                    {/* Expected skills */}
                    <ul className="my-3 flex flex-wrap gap-1.5 text-xs font-medium">
                      {r.activity.skills.map((s) => (
                        <li
                          key={s}
                          className="rounded-lg bg-background/60 px-2 py-0.5 text-foreground"
                        >
                          ✓ {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Outcome Recording Section with the Exact 3 Buttons */}
                  <div className="mt-4 border-t border-border/40 pt-3">
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
                            r.activity.id,
                            r.activity.steps.length,
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
                            r.activity.id,
                            r.activity.steps.length,
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
                            r.activity.id,
                            r.activity.steps.length,
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
            These children do not have any recorded classroom observations yet. Record an initial
            observation across any of the 5 learning areas to generate tailored activity
            recommendations.
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
