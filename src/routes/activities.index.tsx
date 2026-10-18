import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock } from "lucide-react";
import { ACTIVITIES, DOMAINS, domainOf, toneBg, type DomainId } from "@/lib/data";
import { PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activities/")({
  head: () => ({
    meta: [
      { title: "Activity Library — VikasSetu" },
      {
        name: "description",
        content: "Simple playgroup activities organised by five learning areas.",
      },
      { property: "og:title", content: "Activity Library — VikasSetu" },
      {
        property: "og:description",
        content: "Simple playgroup activities organised by five learning areas.",
      },
    ],
  }),
  component: Activities,
});

function Activities() {
  const [filter, setFilter] = useState<DomainId | "all">("all");
  const list = ACTIVITIES.filter((a) => filter === "all" || a.domain === filter);
  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Activity library"
        title="Activities"
        subtitle="Short, low-cost activities you can do with everyday classroom materials."
      />
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "btn btn-ghost shrink-0",
            filter === "all" && "!bg-foreground !text-background",
          )}
        >
          All
        </button>
        {DOMAINS.map((d) => (
          <button
            key={d.id}
            onClick={() => setFilter(d.id)}
            className={cn(
              "btn btn-ghost shrink-0",
              filter === d.id && "!bg-foreground !text-background",
            )}
          >
            {d.emoji} {d.short}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
        {list.map((a) => {
          const d = domainOf(a.domain);
          return (
            <div key={a.id} className="card-soft tilt shine flex flex-col overflow-hidden">
              <div
                className={cn(
                  "flex h-28 items-center justify-center text-6xl",
                  d ? toneBg[d.tone] : "bg-muted",
                )}
              >
                {a.emoji}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {d?.name ?? a.domain}
                </p>
                <h3 className="mt-1 text-xl font-bold">{a.name}</h3>
                <div className="mt-2 flex gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {a.minutes} min
                  </span>
                  <span>· {a.difficulty}</span>
                </div>
                <div className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                  {a.skills.map((s) => (
                    <span key={s} className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                      {s}
                    </span>
                  ))}
                </div>
                <Link
                  to="/activities/$id"
                  params={{ id: a.id }}
                  search={{}}
                  className="btn btn-primary mt-4"
                >
                  ▶ Start Activity
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
