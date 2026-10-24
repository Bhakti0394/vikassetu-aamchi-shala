import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui-kit";
import { ChildAvatar } from "@/components/ChildAvatar";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import type { Child } from "@/lib/data";

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

// Helper to format date as YYYY-MM-DD for the API
const getFormatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Attendance() {
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const todayKey = getFormatDate(today);

  // Days of the current month up to today (excluding Sundays)
  const days = Array.from(
    { length: today.getDate() },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1),
  ).filter((d) => d.getDay() !== 0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<Child[]>("/children"),
      apiRequest<{ attendance: Record<string, Record<string, boolean>> }>("/attendance"),
    ])
      .then(([childrenData, attendanceData]) => {
        if (!active) return;
        setChildrenList(childrenData || []);
        setAttendanceMap(attendanceData?.attendance || {});
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load attendance data:", err);
        setError("Unable to load attendance. Please verify backend is running.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSetPresent = async (childId: string, isPresent: boolean) => {
    // Optimistic update
    setAttendanceMap((prev) => ({
      ...prev,
      [childId]: {
        ...(prev[childId] || {}),
        [todayKey]: isPresent,
      },
    }));

    try {
      await apiRequest("/attendance", {
        method: "POST",
        body: JSON.stringify({
          childId: childId,
          date: todayKey,
          present: isPresent,
        }),
      });
    } catch (err) {
      console.error("Failed to save attendance:", err);
      // Revert on failure
      setAttendanceMap((prev) => {
        const childRecords = { ...(prev[childId] || {}) };
        delete childRecords[todayKey];
        return {
          ...prev,
          [childId]: childRecords,
        };
      });
    }
  };

  const calculateMonthlyPct = (childId: string) => {
    const childAtt = attendanceMap[childId] || {};
    const totalRecorded = Object.keys(childAtt).length;
    if (totalRecorded === 0) return 0;
    const presentCount = Object.values(childAtt).filter(Boolean).length;
    return Math.round((presentCount / totalRecorded) * 100);
  };

  if (loading) {
    return <div className="p-10 text-center font-bold text-muted-foreground">Loading attendance...</div>;
  }

  if (error) {
    return <div className="p-10 text-center font-bold text-coral">{error}</div>;
  }

  // Calculate today's stats based on marked records
  const presentToday = childrenList.filter((c) => attendanceMap[c.id]?.[todayKey] === true).length;
  const absentToday = childrenList.filter((c) => attendanceMap[c.id]?.[todayKey] === false).length;
  const pct = childrenList.length ? Math.round((presentToday / childrenList.length) * 100) : 0;

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
          <p className="font-display text-3xl font-bold text-primary">{presentToday}</p>
          <p className="text-sm font-semibold text-muted-foreground">Present</p>
        </div>
        <div className="card-soft p-5">
          <p className="font-display text-3xl font-bold text-coral">{absentToday}</p>
          <p className="text-sm font-semibold text-muted-foreground">Absent</p>
        </div>
        <div className="card-soft p-5">
          <p className="font-display text-3xl font-bold">{pct}%</p>
          <p className="text-sm font-semibold text-muted-foreground">Class Total Today</p>
        </div>
      </div>

      <div className="space-y-3 stagger">
        {childrenList.map((c) => {
          const todayStatus = attendanceMap[c.id]?.[todayKey];

          return (
            <div
              key={c.id}
              className="card-soft flex flex-col gap-4 p-4 md:flex-row md:items-center"
            >
              <div className="flex items-center gap-3 md:w-48">
                <ChildAvatar child={c} size="sm" />
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {calculateMonthlyPct(c.id)}% this month
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-wrap gap-1">
                {days.map((d) => {
                  const dKey = getFormatDate(d);
                  const v = attendanceMap[c.id]?.[dKey];
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
                  onClick={() => handleSetPresent(c.id, true)}
                  className={cn("btn px-4 py-2", todayStatus === true ? "btn-primary" : "btn-ghost")}
                >
                  Present
                </button>
                <button
                  onClick={() => handleSetPresent(c.id, false)}
                  className={cn(
                    "btn px-4 py-2",
                    todayStatus === false ? "bg-coral text-primary-foreground" : "btn-ghost",
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
