import { createFileRoute } from "@tanstack/react-router";
import { useStore, isPresentToday, attendancePct } from "@/lib/store";
import { dateKey } from "@/lib/data";
import { Avatar, PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — VikasSetu" },
      {
        name: "description",
        content: "Mark daily attendance in one tap and see each child's monthly overview.",
      },
      { property: "og:title", content: "Attendance — VikasSetu" },
      {
        property: "og:description",
        content: "Mark daily attendance in one tap and see each child's monthly overview.",
      },
    ],
  }),
  component: Attendance,
});

function Attendance() {
  const { children, attendance, setPresent } = useStore();
  const today = new Date();
  const present = children.filter((c) => isPresentToday(attendance, c.id)).length;
  const pct = children.length ? Math.round((present / children.length) * 100) : 0;
  const days = Array.from(
    { length: today.getDate() },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1),
  ).filter((d) => d.getDay() !== 0);

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={today.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        title="Attendance"
        subtitle="Tap Present or Absent for each child."
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card-soft p-5">
          <p className="font-display text-3xl font-bold text-primary">{present}</p>
          <p className="text-sm font-semibold text-muted-foreground">Present</p>
        </div>
        <div className="card-soft p-5">
          <p className="font-display text-3xl font-bold text-coral">{children.length - present}</p>
          <p className="text-sm font-semibold text-muted-foreground">Absent</p>
        </div>
        <div className="card-soft p-5">
          <p className="font-display text-3xl font-bold">{pct}%</p>
          <p className="text-sm font-semibold text-muted-foreground">Today</p>
        </div>
      </div>

      <div className="space-y-3 stagger">
        {children.map((c) => {
          const on = isPresentToday(attendance, c.id);
          return (
            <div
              key={c.id}
              className="card-soft flex flex-col gap-4 p-4 md:flex-row md:items-center"
            >
              <div className="flex items-center gap-3 md:w-48">
                <Avatar child={c} size="sm" />
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {attendancePct(attendance, c.id)}% this month
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-wrap gap-1">
                {days.map((d) => {
                  const v = attendance[c.id]?.[dateKey(d)];
                  return (
                    <span
                      key={d.getDate()}
                      title={d.toDateString()}
                      className={cn(
                        "h-4 w-4 rounded",
                        v === undefined ? "bg-muted" : v ? "bg-primary" : "bg-coral opacity-70",
                      )}
                    />
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPresent(c.id, true)}
                  className={cn("btn px-4 py-2", on ? "btn-primary" : "btn-ghost")}
                >
                  Present
                </button>
                <button
                  onClick={() => setPresent(c.id, false)}
                  className={cn(
                    "btn px-4 py-2",
                    !on ? "bg-coral text-primary-foreground" : "btn-ghost",
                  )}
                >
                  Absent
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
