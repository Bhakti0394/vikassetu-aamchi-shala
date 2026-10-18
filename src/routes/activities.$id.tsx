import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Clock, Check } from "lucide-react";
import { activityOf, domainOf, toneBg } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

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

function ActivityRun() {
  const { id } = Route.useParams();
  const { child: childId } = Route.useSearch();
  const { children } = useStore();
  const a = activityOf(id);
  const child = children.find((c) => c.id === childId);
  const [done, setDone] = useState<number[]>([]);
  if (!a) return <p>Activity not found.</p>;
  const d = domainOf(a.domain);
  const allDone = done.length === a.steps.length;

  return (
    <div className="fade-up mx-auto max-w-2xl space-y-6">
      <Link
        to="/activities"
        className="inline-flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Activities
      </Link>
      <section className={cn("rounded-3xl p-8 text-center", toneBg[d.tone])}>
        <div className="text-7xl">{a.emoji}</div>
        <p className="mt-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {d.name}
        </p>
        <h1 className="text-4xl font-bold">{a.name}</h1>
        <p className="mt-2 flex items-center justify-center gap-1 font-semibold text-muted-foreground">
          <Clock className="h-4 w-4" /> {a.minutes} min · {a.difficulty}
        </p>
        {child && (
          <div className="mx-auto mt-5 inline-flex items-center gap-3 rounded-full bg-card py-1.5 pl-1.5 pr-5 shadow-soft">
            <Avatar child={child} size="sm" /> <span className="font-bold">With {child.name}</span>
          </div>
        )}
      </section>

      <section className="card-soft p-6">
        <h2 className="mb-4 text-xl font-bold">Steps — tap each when done</h2>
        <ol className="space-y-3 stagger">
          {a.steps.map((s, i) => {
            const on = done.includes(i);
            return (
              <li key={i}>
                <button
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

      <Link
        to="/progress"
        search={{ ...(childId ? { child: childId } : {}), domain: a.domain, activity: a.id }}
        className={cn("btn w-full py-4 text-lg", allDone ? "btn-primary" : "btn-sun")}
      >
        {allDone ? "Done! Record how it went →" : "Finish & Record Observation →"}
      </Link>
    </div>
  );
}
