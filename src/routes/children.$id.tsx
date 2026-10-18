import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, PenLine, CheckCircle2, HeartHandshake } from "lucide-react";
import { useState, useEffect } from "react";
import { recommendFor, activityOf, domainOf, toneBg } from "@/lib/data";
import { Avatar, DomainBars, DomainChip, ScoreBadge, StartButton } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/children/$id")({
  component: Profile,
});

function Profile() {
  const { id } = Route.useParams();
  
  const [ch, setCh] = useState<any>(null);
  const [obs, setObs] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest(`/children/${id}`),
      apiRequest(`/observations?child_id=${id}`),
      apiRequest('/attendance')
    ]).then(([childData, obsData, attData]: any) => {
      setCh(childData);
      setObs(obsData);
      setAttendanceMap(attData.attendance || {});
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="py-20 text-center text-muted-foreground font-bold">Loading child profile...</div>;
  
  if (!ch)
    return (
      <div className="py-20 text-center">
        <p>Child not found.</p>
        <Link to="/children" className="btn btn-primary mt-4">
          Back
        </Link>
      </div>
    );

  const recs = recommendFor(ch);
  
  // Calculate attendance status and percentage
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const present = attendanceMap[ch.id]?.[dateKey] ?? false;
  
  const childAtt = attendanceMap[ch.id] || {};
  const totalDays = Object.keys(childAtt).length;
  const presentDays = Object.values(childAtt).filter(Boolean).length;
  const attPct = totalDays === 0 ? 0 : Math.round((presentDays / totalDays) * 100);

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
            {attPct}% attendance
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
              {(ch.strengths.length ? ch.strengths : ["Observations coming soon"]).map((s: string) => (
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
              {ch.needs.map((s: string) => (
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
            {recs.map((r) => (
              <div key={r.domain} className="card-soft p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl text-3xl",
                      toneBg[domainOf(r.domain).tone],
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
            ))}
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