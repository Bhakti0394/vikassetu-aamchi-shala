import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, X, Calendar } from "lucide-react";
import { ChildAvatar } from "@/components/ChildAvatar";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { PageLoader } from "@/components/PageLoader";
import { useI18n } from "@/lib/i18n";
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

export function Attendance() {
  const { t } = useI18n();
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

  // Calculate today's stats based on marked records
  const presentToday = childrenList.filter((c) => attendanceMap[c.id]?.[todayKey] === true).length;
  const absentToday = childrenList.filter((c) => attendanceMap[c.id]?.[todayKey] === false).length;
  const pct = childrenList.length ? Math.round((presentToday / childrenList.length) * 100) : 0;

  if (loading && childrenList.length === 0) {
    return <PageLoader fullScreen={false} message="Loading attendance register…" />;
  }

  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div
      className="fade-up mx-auto max-w-6xl space-y-7 pb-16 text-[#26332D]"
      style={
        {
          "--status-present": "#2F7D4F",
          "--status-absent": "#C94A3F",
          "--status-absent-text": "#B23A30",
          "--status-none": "#E2D9C8",
        } as React.CSSProperties
      }
    >
      {/* 1. Header (Solid forest green title, muted date line underneath, calm top spacing) */}
      <header className="space-y-1.5 pt-2 sm:pt-3">
        <h1 className="font-display text-[28px] sm:text-[32px] font-bold tracking-tight text-[#193F32] leading-tight">
          {t("att.title", "Attendance")}
        </h1>
        <p className="text-[14px] text-[#5F6B62] font-semibold flex items-center gap-1.5">
          <Calendar aria-hidden="true" className="h-4 w-4 text-[#5F6B62]" />
          <span>{formattedDate}</span>
        </p>
        <p className="text-[14px] text-[#5F6B62] leading-relaxed max-w-[65ch]">
          {t("att.subtitle", "Tap Present or Absent for each child to record today's roll.")}
        </p>
      </header>

      {/* 2. Summary (One slim strip on cream #F4EFE3 rounded 12px background) */}
      <div className="rounded-[12px] border border-[#E2D9C8] bg-[#F4EFE3] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(25,63,50,0.06)]">
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Present */}
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#2F7D4F] shrink-0" />
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[#2F7D4F] leading-none">
                {presentToday}
              </span>
              <span className="text-sm font-semibold text-[#5F6B62] ml-1.5">{t("att.present", "Present")}</span>
            </div>
          </div>

          {/* Absent */}
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#C94A3F] shrink-0" />
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[#26332D] leading-none">
                {absentToday}
              </span>
              <span className="text-sm font-semibold text-[#5F6B62] ml-1.5">{t("att.absent", "Absent")}</span>
            </div>
          </div>
        </div>

        {/* Percent with thin progress bar */}
        <div className="flex items-center gap-3 min-w-[200px] sm:max-w-xs w-full sm:w-auto">
          <div className="flex-1">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-semibold text-[#5F6B62]">Class Total Today</span>
              <span className="text-base sm:text-lg font-bold text-[#2F7D4F]">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#E2D9C8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#2F7D4F] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Legend (Single quiet legend strip under the summary) */}
      <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-[#5F6B62] px-1">
        <span className="text-[12px] font-bold text-[#26332D]">Month history:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-2 rounded-[2px] bg-[#2F7D4F]" aria-hidden="true" />
          <span>{t("att.present", "Present")}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-2 rounded-[2px] bg-[#C94A3F]" aria-hidden="true" />
          <span>{t("att.absent", "Absent")}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-2 rounded-[2px] bg-[#E2D9C8]" aria-hidden="true" />
          <span>No record</span>
        </span>
      </div>

      {/* 3. Roster List (Single list on page background with 1px #E2D9C8 hairlines) */}
      <section aria-label="Daily attendance roster">
        {loading && childrenList.length === 0 ? (
          /* Cream Loading Skeletons */
          <div className="divide-y divide-[#E2D9C8] border-t border-[#E2D9C8]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-4 px-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#F4EFE3]" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 rounded bg-[#F4EFE3]" />
                    <div className="h-3 w-20 rounded bg-[#F4EFE3]" />
                  </div>
                </div>
                <div className="h-5 w-32 rounded bg-[#F4EFE3] hidden md:block" />
                <div className="h-10 w-44 rounded-[10px] bg-[#F4EFE3]" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State in Palette */
          <div className="rounded-[14px] border border-[#C94A3F] bg-[#FFFDF8] p-6 text-center shadow-[0_1px_2px_rgba(25,63,50,0.06)] space-y-2">
            <p className="font-bold text-base text-[#26332D]">Unable to load attendance</p>
            <p className="text-sm text-[#5F6B62]">{error}</p>
          </div>
        ) : childrenList.length === 0 ? (
          /* Empty State */
          <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-10 text-center text-[#5F6B62] shadow-[0_1px_2px_rgba(25,63,50,0.06)]">
            <p className="font-bold text-base text-[#26332D]">No children in class</p>
            <p className="text-sm text-[#5F6B62] mt-1">Add children to the class to start tracking attendance.</p>
          </div>
        ) : (
          /* Hairline Roster Rows */
          <div className="divide-y divide-[#E2D9C8] border-t border-[#E2D9C8]">
            {childrenList.map((c) => {
              const todayStatus = attendanceMap[c.id]?.[todayKey];
              const monthlyPct = calculateMonthlyPct(c.id);
              const isBelow75 = monthlyPct < 75;

              return (
                <div
                  key={c.id}
                  data-testid={`attendance-row-${c.id}`}
                  className="group flex flex-col md:flex-row md:items-center justify-between gap-3.5 py-4 sm:py-4.5 px-3 sm:px-4 transition-colors duration-150 rounded-[12px] hover:bg-[#F4EFE3]"
                >
                  {/* Child Info: Avatar 48px + Name + Monthly Percentage */}
                  <div className="flex items-center gap-3.5 min-w-[200px]">
                    <ChildAvatar child={c} size="lg" />
                    <div className="min-w-0">
                      <p className="text-[17px] font-semibold text-[#26332D] leading-tight truncate">
                        {c.name}
                      </p>
                      <p className="text-[13px] sm:text-[14px] text-[#5F6B62] mt-0.5 flex items-center gap-1.5 leading-none">
                        {isBelow75 && (
                          <span
                            aria-hidden="true"
                            title="Attendance below 75%"
                            className="h-1.5 w-1.5 rounded-full bg-[#C94A3F] shrink-0"
                          />
                        )}
                        <span>{monthlyPct}% this month</span>
                      </p>
                    </div>
                  </div>

                  {/* Month History Bars: Slim bars (8px wide, 20px tall, 3px gap, 2px radius) */}
                  <div
                    className="hidden md:flex flex-1 items-center justify-center gap-[3px] overflow-x-auto no-scrollbar py-1 px-3"
                    role="group"
                    aria-label={`Attendance history for ${c.name}: ${monthlyPct}% present`}
                  >
                    {days.map((d) => {
                      const dKey = getFormatDate(d);
                      const v = attendanceMap[c.id]?.[dKey];
                      const statusText = v === undefined ? "No record" : v ? "Present" : "Absent";
                      const dateFormatted = d.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <span
                          key={d.getDate()}
                          title={`${dateFormatted}: ${statusText}`}
                          aria-label={`${dateFormatted}: ${statusText}`}
                          className={cn(
                            "h-5 w-2 rounded-[2px] shrink-0 transition-transform duration-100 hover:scale-115 cursor-default",
                            v === undefined
                              ? "bg-[#E2D9C8]"
                              : v
                              ? "bg-[#2F7D4F]"
                              : "bg-[#C94A3F]"
                          )}
                        />
                      );
                    })}
                  </div>

                  {/* 5. Present/Absent Segmented Toggle Control */}
                  <div
                    role="group"
                    aria-label={`Mark attendance for ${c.name}`}
                    className="flex sm:inline-flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto"
                  >
                    {/* Present Option */}
                    <button
                      type="button"
                      aria-pressed={todayStatus === true}
                      onClick={() => handleSetPresent(c.id, true)}
                      className={cn(
                        "flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs sm:text-sm font-bold min-h-[42px] min-w-[84px] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#193F32]",
                        todayStatus === true
                          ? "bg-[#2F7D4F] text-white border border-[#2F7D4F] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                          : "bg-transparent border border-[#E2D9C8] text-[#5F6B62] hover:bg-[#F4EFE3] hover:text-[#26332D]"
                      )}
                    >
                      {todayStatus === true && <Check aria-hidden="true" size={15} strokeWidth={2.5} className="text-white" />}
                      <span>{t("att.present", "Present")}</span>
                    </button>

                    {/* Absent Option */}
                    <button
                      type="button"
                      aria-pressed={todayStatus === false}
                      onClick={() => handleSetPresent(c.id, false)}
                      className={cn(
                        "flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs sm:text-sm font-bold min-h-[42px] min-w-[84px] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#193F32]",
                        todayStatus === false
                          ? "bg-[#C94A3F] text-white border border-[#C94A3F] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                          : "bg-transparent border border-[#E2D9C8] text-[#5F6B62] hover:bg-[#F4EFE3] hover:text-[#26332D]"
                      )}
                    >
                      {todayStatus === false && <X aria-hidden="true" size={15} strokeWidth={2.5} className="text-white" />}
                      <span>{t("att.absent", "Absent")}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
