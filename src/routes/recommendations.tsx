import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Target, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { recommendFor, domainOf, toneBg } from "@/lib/data";
import { Avatar, PageHeader, StartButton } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

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
  component: Recs,
});

function Recs() {
  const { children, observations } = useStore();
  const recs = children
    .flatMap((c) => recommendFor(c).slice(0, 1))
    .sort((a, b) => a.level - b.level);

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Recommended for you"
        title="Recommendations"
        subtitle="Every suggestion comes from what you observed. Here's why each activity was chosen."
      />

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

      <div className="space-y-4 stagger">
        {recs.map((r) => {
          const d = domainOf(r.domain);
          const lastObs = observations.find(
            (o) => o.childId === r.child.id && o.domain === r.domain,
          );
          return (
            <div key={r.child.id} className="card-soft overflow-hidden">
              <div className="grid lg:grid-cols-3">
                <div className="flex items-center gap-3 border-b p-5 lg:border-b-0 lg:border-r">
                  <Avatar child={r.child} />
                  <div>
                    <Link
                      to="/children/$id"
                      params={{ id: r.child.id }}
                      className="font-display text-2xl font-bold hover:text-primary"
                    >
                      {r.child.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {lastObs?.note ? `"${lastObs.note}"` : `${d.short}: level ${r.level}/3`}
                    </p>
                  </div>
                </div>
                <div className="border-b p-5 lg:border-b-0 lg:border-r">
                  <p className="text-xs font-bold uppercase tracking-wide text-coral">
                    Learning gap
                  </p>
                  <p className="mt-1 font-bold">
                    {d.emoji} {d.name} — Level {r.level}/3
                  </p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Why this activity?
                  </p>
                  <p className="text-sm font-semibold">"{r.reason}"</p>
                </div>
                <div className={cn("flex flex-col p-5", toneBg[d.tone])}>
                  <p className="font-display text-xl font-bold">
                    {r.activity.emoji} {r.child.name} → {r.activity.name}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Expected improvement
                  </p>
                  <ul className="mb-4 mt-1 flex-1 text-sm font-semibold">
                    {r.activity.skills.map((s) => (
                      <li key={s}>✓ {s}</li>
                    ))}
                  </ul>
                  <StartButton activityId={r.activity.id} childId={r.child.id} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
