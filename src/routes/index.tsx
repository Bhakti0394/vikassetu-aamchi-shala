import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, PenLine, ArrowRight } from "lucide-react";
import {
  DOMAINS,
  recommendFor,
  domainOf,
  toneBg,
  toneFill,
} from "@/lib/data";
import { Avatar, DomainChip } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1100);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetching real data from Bhakti's API
    apiRequest('/dashboard/summary')
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err);
        setLoading(false);
      });
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading || !summary) {
    return <div className="p-10 text-center font-bold text-muted-foreground">Loading dashboard data...</div>;
  }

  const focus = summary.attentionList.slice(0, 3);

  const stats = [
    { label: "Total Children", value: summary.totalChildren, emoji: "🧒", tone: "bg-teal-soft" },
    { label: "Present Today", value: summary.presentToday, emoji: "✅", tone: "bg-primary-soft" },
    { label: "Need Attention", value: summary.needsAttentionCount, emoji: "💛", tone: "bg-sun-soft" },
    { label: "Activities Done", value: summary.activitiesDone, emoji: "⭐", tone: "bg-coral-soft" },
  ];

  return (
    <div className="fade-up space-y-8">
      <section className="hero-gradient relative overflow-hidden rounded-3xl p-7 text-primary-foreground shadow-lift sm:p-10">
        <div className="blob pointer-events-none absolute -right-16 -top-20 h-72 w-72 bg-sun opacity-40" />
        <div className="blob pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 bg-primary-foreground opacity-10" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="stagger">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-sm font-bold backdrop-blur">
              <span className="pulse-ring h-2 w-2 rounded-full bg-sun" /> {greet}, Teacher 👋
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-5xl">
              What should I do today?
            </h1>
            <p className="mt-3 max-w-md text-lg opacity-90">
              Every child learns differently. {focus.length} children could use a little extra
              support today — start with them.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/progress" className="btn btn-sun shine shadow-lift">
                <PenLine className="h-4 w-4" /> Record Observation
              </Link>
              <Link
                to="/children"
                search={{ add: true }}
                className="btn shine bg-card text-foreground hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" /> Add Child
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
        {stats.map((s) => (
          <div key={s.label} className="card-soft tilt shine p-5">
            <div
              className={cn(
                "wiggle mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl",
                s.tone,
              )}
            >
              {s.emoji}
            </div>
            <p className="font-display text-4xl font-bold">
              <CountUp value={s.value} />
            </p>
            <p className="text-sm font-semibold text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              Today's <span className="text-gradient">Focus</span>
            </h2>
            <p className="text-muted-foreground">Children who may need additional support</p>
          </div>
          <Link
            to="/recommendations"
            className="hidden items-center gap-1 font-bold text-primary sm:flex"
          >
            All recommendations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3 stagger">
          {focus.map((ch: any) => {
            const rec = recommendFor(ch)[0];
            if (!rec) return null;
            return (
              <div key={ch.id} className="card-soft tilt shine flex flex-col p-5">
                <Link to="/children/$id" params={{ id: ch.id }} className="flex items-center gap-3">
                  <Avatar child={ch} />
                  <div>
                    <p className="font-display text-xl font-bold">{ch.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Level {rec.level}/3 in {domainOf(rec.domain).short}
                    </p>
                  </div>
                </Link>
                <div className="mt-4 space-y-2 text-sm">
                  <DomainChip id={rec.domain} />
                  <p>
                    <span className="font-bold">Need:</span> {ch.needs[0] ?? "More practice"}
                  </p>
                </div>
                <div className="mt-4 flex-1 rounded-xl bg-muted p-3 text-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Suggested activity
                  </p>
                  <p className="font-bold">
                    {rec.activity.emoji} {rec.activity.name}
                  </p>
                </div>
                <Link
                  to="/activities/$id"
                  params={{ id: rec.activity.id }}
                  search={{ child: ch.id }}
                  className="btn btn-primary mt-4"
                >
                  ▶ Start
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card-soft p-6">
        <h2 className="text-2xl font-bold">Class learning overview</h2>
        <p className="mb-6 text-muted-foreground">
          How many children are at each level, by learning area
        </p>
        <div className="space-y-5">
          {DOMAINS.map((d) => {
            const counts = [1, 2, 3].map(
              (lvl) => summary.domainDistribution[d.id]?.[lvl] || 0
            );
            const total = summary.totalChildren || 1;
            return (
              <div key={d.id}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold">
                    {d.emoji} {d.name}
                  </span>
                  <span className="text-muted-foreground">
                    {counts[2]} of {summary.totalChildren} doing well
                  </span>
                </div>
                <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                  <div
                    className="grow-x bg-coral"
                    style={{ width: `${((counts[0] ?? 0) / total) * 100}%` }}
                  />
                  <div
                    className="grow-x bg-sun"
                    style={{ width: `${((counts[1] ?? 0) / total) * 100}%` }}
                  />
                  <div
                    className={cn("grow-x", toneFill.primary)}
                    style={{ width: `${((counts[2] ?? 0) / total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <span className={toneBg.primary + " hidden"} />
    </div>
  );
}