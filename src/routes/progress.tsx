import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  ACTIVITIES,
  DOMAINS,
  SCORE_LABEL,
  activityOf,
  domainOf,
  toneBg,
  type DomainId,
  type Score,
} from "@/lib/data";
import { Avatar, DomainChip, PageHeader, ScoreBadge } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

type S = {
  child?: string | undefined;
  domain?: DomainId | undefined;
  activity?: string | undefined;
};

export const Route = createFileRoute("/progress")({
  validateSearch: (s: Record<string, unknown>): S => ({
    child: typeof s["child"] === "string" ? s["child"] : undefined,
    domain: DOMAINS.some((d) => d.id === s["domain"]) ? (s["domain"] as DomainId) : undefined,
    activity: typeof s["activity"] === "string" ? s["activity"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Record Progress — VikasSetu" },
      {
        name: "description",
        content: "Record a 1–3 observation in a few taps and update each child's progress.",
      },
      { property: "og:title", content: "Record Progress — VikasSetu" },
      {
        property: "og:description",
        content: "Record a 1–3 observation in a few taps and update each child's progress.",
      },
    ],
  }),
  component: ProgressPage,
});

const SCORE_STYLE: Record<Score, string> = {
  1: "border-coral bg-coral-soft",
  2: "border-sun bg-sun-soft",
  3: "border-primary bg-primary-soft",
};
const SCORE_EMOJI: Record<Score, string> = { 1: "🌱", 2: "🌿", 3: "🌳" };

function ProgressPage() {
  const search = Route.useSearch();
  const { children, observations, addObservation } = useStore();
  const [childId, setChildId] = useState(search.child);
  const [domain, setDomain] = useState<DomainId | undefined>(search.domain);
  const [activityId, setActivityId] = useState(search.activity);
  const [score, setScore] = useState<Score>();
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<{
    childId: string;
    prev: Score;
    score: Score;
    domain: DomainId;
  } | null>(null);

  useEffect(() => {
    setSaved(null);
    setChildId(search.child);
    setDomain(search.domain);
    setActivityId(search.activity);
    setScore(undefined);
    setNote("");
  }, [search.child, search.domain, search.activity]);

  const child = children.find((c) => c.id === childId);
  const acts = ACTIVITIES.filter((a) => a.domain === domain);
  const ready = child && domain && activityId && acts.some((a) => a.id === activityId) && score;

  const save = () => {
    if (!ready) return;
    setSaved({ childId: child.id, prev: child.scores[domain], score, domain });
    addObservation({ childId: child.id, domain, activityId, score, note: note.trim() });
  };
  const again = () => {
    setSaved(null);
    setChildId(undefined);
    setDomain(undefined);
    setActivityId(undefined);
    setScore(undefined);
    setNote("");
  };

  if (saved) {
    const ch = children.find((c) => c.id === saved.childId)!;
    return (
      <div className="fade-up mx-auto max-w-lg py-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
          <CheckCircle2 className="h-11 w-11 text-primary" />
        </div>
        <h1 className="mt-5 text-3xl font-bold">Observation recorded successfully.</h1>
        <p className="mt-2 text-muted-foreground">{ch.name}'s progress has been updated.</p>
        <div className="card-soft mt-6 flex items-center justify-center gap-4 p-5">
          <Avatar child={ch} />
          <div className="text-left">
            <p className="font-bold">{domainOf(saved.domain)?.name ?? saved.domain}</p>
            <p className="text-sm text-muted-foreground">
              Level {saved.prev} →{" "}
              <span className="font-bold text-primary">Level {saved.score}</span>
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/children/$id" params={{ id: ch.id }} className="btn btn-primary">
            View {ch.name}'s profile
          </Link>
          <button onClick={again} className="btn btn-ghost">
            Record another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Record progress"
        title="Record an Observation"
        subtitle="Five quick steps. Tap to choose — no typing needed except an optional note."
      />
      <div className="mx-auto max-w-3xl space-y-5">
        <Step n={1} title="Select child" done={!!child}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setChildId(c.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition",
                  childId === c.id
                    ? "border-primary bg-primary-soft"
                    : "border-transparent hover:bg-muted",
                )}
              >
                <Avatar child={c} size="sm" />
                <span className="text-sm font-bold">{c.name}</span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Select learning area" done={!!domain} disabled={!child}>
          <div className="grid gap-2 sm:grid-cols-2">
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setDomain(d.id);
                  setActivityId(undefined);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition",
                  domain === d.id
                    ? "border-primary bg-primary-soft"
                    : "border-transparent " + toneBg[d.tone],
                )}
              >
                <span className="text-2xl">{d.emoji}</span>
                <span className="flex-1 font-bold">{d.name}</span>
                {child && (
                  <span className="text-xs font-bold text-muted-foreground">
                    now {child.scores[d.id]}/3
                  </span>
                )}
              </button>
            ))}
          </div>
        </Step>

        <Step n={3} title="Select activity" done={!!activityId} disabled={!domain}>
          <div className="flex flex-wrap gap-2">
            {acts.map((a) => (
              <button
                key={a.id}
                onClick={() => setActivityId(a.id)}
                className={cn(
                  "rounded-full border-2 px-4 py-2 font-bold transition",
                  activityId === a.id
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:bg-muted",
                )}
              >
                {a.emoji} {a.name}
              </button>
            ))}
          </div>
        </Step>

        <Step n={4} title="Give a score" done={!!score} disabled={!activityId}>
          <div className="grid grid-cols-3 gap-3">
            {([1, 2, 3] as Score[]).map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className={cn(
                  "rounded-2xl border-2 p-4 text-center transition",
                  score === s ? SCORE_STYLE[s] : "border-border hover:bg-muted",
                )}
              >
                <div className="text-3xl">{SCORE_EMOJI[s]}</div>
                <div className="font-display text-2xl font-bold">{s}</div>
                <div className="text-sm font-bold">{SCORE_LABEL[s]}</div>
              </button>
            ))}
          </div>
        </Step>

        <Step n={5} title="Add an observation (optional)" done={!!note} disabled={!score}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Recognised A, B and C but needed help with D and E."
            className="w-full rounded-2xl border bg-background p-4 outline-none focus:ring-2 focus:ring-ring"
          />
        </Step>

        <button
          disabled={!ready}
          onClick={save}
          className="btn btn-primary w-full py-4 text-lg disabled:pointer-events-none disabled:opacity-40"
        >
          Save Observation
        </button>

        <section className="pt-8">
          <h2 className="mb-4 text-2xl font-bold">Recent observations</h2>
          <ul className="space-y-3 stagger">
            {observations.slice(0, 6).map((o) => {
              const c = children.find((x) => x.id === o.childId);
              if (!c) return null;
              return (
                <li key={o.id} className="card-soft flex items-start gap-3 p-4">
                  <Avatar child={c} size="sm" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{c.name}</span>
                      <DomainChip id={o.domain} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activityOf(o.activityId)?.name}
                      {o.note && ` — "${o.note}"`}
                    </p>
                  </div>
                  <ScoreBadge score={o.score} />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  done,
  disabled,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("card-soft p-5 transition", disabled && "pointer-events-none opacity-45")}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
            done ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          {done ? "✓" : n}
        </span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
