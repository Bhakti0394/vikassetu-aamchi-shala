import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Avatar, PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/attendance")({
  component: Attendance,
});

// Helper to format date as YYYY-MM-DD for the API
const getFormatDate = (d: Date) => 
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Attendance() {
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayKey = getFormatDate(today);

  // Generate days of the current month up to today (excluding Sundays)
  const days = Array.from(
    { length: today.getDate() },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1),
  ).filter((d) => d.getDay() !== 0);

  useEffect(() => {
    Promise.all([
      apiRequest('/children'),
      apiRequest('/attendance')
    ]).then(([childrenData, attendanceData]: any) => {
      setChildrenList(childrenData);
      setAttendanceMap(attendanceData.attendance || {});
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load attendance data:", err);
      setLoading(false);
    });
  }, []);

  const handleSetPresent = async (childId: string, isPresent: boolean) => {
    // Optimistically update the UI instantly
    setAttendanceMap((prev: any) => ({
      ...prev,
      [childId]: {
        ...(prev[childId] || {}),
        [todayKey]: isPresent
      }
    }));

    try {
      // Save to database
      await apiRequest('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          childId: childId,
          date: todayKey,
          present: isPresent
        })
      });
    } catch (error) {
      console.error("Failed to save attendance:", error);
      // If it fails, ideally we would revert the optimistic update here
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

  // Calculate today's stats based ONLY on explicitly marked records
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
          // Status for today: true (Present), false (Absent), or undefined (Not marked yet)
          const todayStatus = attendanceMap[c.id]?.[todayKey]; 

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