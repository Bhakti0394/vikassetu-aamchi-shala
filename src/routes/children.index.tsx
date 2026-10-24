import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Plus,
  X,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useStore, isPresentToday } from "@/lib/store";
import { avgLevel, domainOf, strongestDomain, weakestDomain, type Child } from "@/lib/data";
import { ChildAvatar } from "@/components/ChildAvatar";
import { AreaIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/children/")({
  validateSearch: (s: Record<string, unknown>): { add?: boolean } =>
    s["add"] ? { add: true } : {},
  head: () => ({
    meta: [
      { title: "Children — VikasSetu" },
      {
        name: "description",
        content: "Every child's learning level, strengths and areas needing attention.",
      },
      { property: "og:title", content: "Children — VikasSetu" },
      {
        property: "og:description",
        content: "Every child's learning level, strengths and areas needing attention.",
      },
    ],
  }),
  component: ChildrenPage,
});

export function ChildrenPage() {
  const { t } = useI18n();
  const store = useStore();
  const { add } = Route.useSearch();
  const navigate = useNavigate();

  // Search & Filter state
  const [q, setQ] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "present" | "absent">("all");

  // Add child form state
  const [name, setName] = useState("");
  const [age, setAge] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Data loading state
  const [childrenList, setChildrenList] = useState<Child[]>(store.children || []);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  // Trigger button ref for accessible focus return
  const addTriggerRef = useRef<HTMLButtonElement | null>(null);

  const loadData = () => {
    let active = true;
    Promise.all([
      apiRequest<Child[]>("/children"),
      apiRequest<{ attendance: Record<string, Record<string, boolean>> }>("/attendance"),
    ])
      .then(([childrenData, attendanceData]) => {
        if (!active) return;
        if (Array.isArray(childrenData) && childrenData.length > 0) {
          setChildrenList(childrenData);
        }
        if (attendanceData?.attendance) {
          setAttendanceMap(attendanceData.attendance);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load children or attendance from API, using store fallback:", err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  };

  useEffect(() => {
    return loadData();
  }, []);

  // Compute attendance status for a child
  const checkIsPresentToday = useCallback(
    (childId: string): boolean => {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      if (attendanceMap[childId] && attendanceMap[childId][dateKey] !== undefined) {
        return attendanceMap[childId][dateKey];
      }
      return isPresentToday(store.attendance, childId);
    },
    [attendanceMap, store.attendance],
  );

  // Attendance summary count
  const attendanceCounts = useMemo(() => {
    let present = 0;
    let absent = 0;
    childrenList.forEach((c) => {
      if (checkIsPresentToday(c.id)) {
        present++;
      } else {
        absent++;
      }
    });
    return { present, absent, total: childrenList.length };
  }, [childrenList, checkIsPresentToday]);

  // Filtered children list
  const filteredList = useMemo(() => {
    return childrenList.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(q.trim().toLowerCase());
      if (!matchesSearch) return false;
      if (attendanceFilter === "all") return true;
      const isPresent = checkIsPresentToday(c.id);
      if (attendanceFilter === "present") return isPresent;
      if (attendanceFilter === "absent") return !isPresent;
      return true;
    });
  }, [childrenList, q, attendanceFilter, checkIsPresentToday]);

  const openAdd = () => {
    setFormError(null);
    setName("");
    setAge(4);
    navigate({ to: "/children", search: { add: true } });
  };

  const closeAdd = () => {
    setFormError(null);
    navigate({ to: "/children", search: {} });
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setFormError("Please enter the child's name.");
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const newChild = await apiRequest<Child>("/children", {
        method: "POST",
        body: JSON.stringify({ name: cleanName, age }),
      });

      if (newChild && newChild.id) {
        store.addChild(cleanName, age);
        setChildrenList((prev) => [newChild, ...prev.filter((c) => c.id !== newChild.id)]);
      } else {
        const id = store.addChild(cleanName, age);
        const localChild: Child = {
          id,
          name: cleanName,
          age,
          avatar: "👦🏽",
          tone: "teal",
          scores: { alphabet: 1, numbers: 1, colours: 1, art: 1, stories: 1 },
          strengths: [],
          needs: [],
        };
        setChildrenList((prev) => [localChild, ...prev]);
      }

      closeAdd();
      setToast({
        type: "success",
        message: `${cleanName} has been added to class records.`,
      });
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      console.error("Failed to add child to database, using local store:", error);
      const id = store.addChild(cleanName, age);
      const localChild: Child = {
        id,
        name: cleanName,
        age,
        avatar: "👦🏽",
        tone: "teal",
        scores: { alphabet: 1, numbers: 1, colours: 1, art: 1, stories: 1 },
        strengths: [],
        needs: [],
      };
      setChildrenList((prev) => [localChild, ...prev]);
      closeAdd();
      setToast({
        type: "success",
        message: `${cleanName} has been added locally.`,
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-up mx-auto max-w-6xl space-y-8 pb-16 text-[#26332D]">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-[12px] px-4 py-3 shadow-[0_4px_12px_rgba(25,63,50,0.15)] transition-all",
            toast.type === "success" ? "bg-[#193F32] text-white" : "bg-[#DF806B] text-white"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#DCE9DD]" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-white" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 rounded-full p-1 hover:bg-black/10 cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Page Header (Solid forest green #193F32, 40-48px top spacing, summary line) */}
      <header className="space-y-2 pt-2 sm:pt-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-[12px] font-bold uppercase tracking-wider text-[#193F32]">
              {t("children.our_class", "Our class")}
            </p>
            <h1 className="font-display text-[28px] sm:text-[32px] font-bold tracking-tight text-[#193F32] leading-tight">
              {t("children.title", "Children")}
            </h1>
            <p className="text-[14px] text-[#5F6B62] leading-relaxed max-w-[65ch]">
              {t("children.subtitle", "Every child's learning level, strengths and areas needing attention.")}
            </p>
            {/* Quiet summary line computed from existing data */}
            <p className="text-[13px] font-semibold text-[#5F6B62] pt-0.5">
              {childrenList.length} children · {attendanceCounts.present} present ·{" "}
              {attendanceCounts.absent} absent
            </p>
          </div>

          <button
            ref={addTriggerRef}
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#193F32] px-4 py-2.5 text-sm font-bold text-[#FAF7EF] hover:bg-[#193F32]/90 transition-colors shadow-[0_1px_2px_rgba(25,63,50,0.06)] min-h-[44px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] self-start sm:self-auto shrink-0"
          >
            <Plus aria-hidden="true" className="h-4 w-4 stroke-[2.5]" />
            <span>{t("dash.add_child", "Add Child")}</span>
          </button>
        </div>
      </header>

      {/* 2. Slim Toolbar (Search Input + Segmented All/Present/Absent Filter) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        {/* Search Input (44px tall, 10-12px radius, #FFFDF8 bg, 1px #E2D9C8 border, 320-360px wide) */}
        <div className="relative w-full sm:w-[340px]">
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F6B62]"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.search", "Search by name…")}
            aria-label="Search children by name"
            className="h-[44px] w-full rounded-[10px] border border-[#E2D9C8] bg-[#FFFDF8] py-2 pl-10 pr-4 text-sm font-medium text-[#26332D] placeholder-[#5F6B62]/70 outline-none transition-colors focus:border-[#193F32] focus:ring-2 focus:ring-[#193F32]"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#5F6B62] hover:text-[#26332D] cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Filter Row (All / Present / Absent) */}
        <div
          role="tablist"
          aria-label="Filter children by attendance"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={attendanceFilter === "all"}
            onClick={() => setAttendanceFilter("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-bold transition-colors duration-150 min-h-[44px] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] cursor-pointer",
              attendanceFilter === "all"
                ? "bg-[#DCE9DD] border border-[#193F32] text-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                : "bg-transparent border border-[#E2D9C8] text-[#26332D] hover:bg-[#F4EFE3] hover:border-[#D8CEBD]"
            )}
          >
            <span>All</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                attendanceFilter === "all" ? "bg-[#193F32]/10 text-[#193F32]" : "bg-[#F4EFE3] text-[#5F6B62]"
              )}
            >
              {childrenList.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={attendanceFilter === "present"}
            onClick={() => setAttendanceFilter("present")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-bold transition-colors duration-150 min-h-[44px] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] cursor-pointer",
              attendanceFilter === "present"
                ? "bg-[#DCE9DD] border border-[#193F32] text-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                : "bg-transparent border border-[#E2D9C8] text-[#26332D] hover:bg-[#F4EFE3] hover:border-[#D8CEBD]"
            )}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#193F32] shrink-0" />
            <span>Present</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                attendanceFilter === "present"
                  ? "bg-[#193F32]/10 text-[#193F32]"
                  : "bg-[#F4EFE3] text-[#5F6B62]"
              )}
            >
              {attendanceCounts.present}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={attendanceFilter === "absent"}
            onClick={() => setAttendanceFilter("absent")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-bold transition-colors duration-150 min-h-[44px] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] cursor-pointer",
              attendanceFilter === "absent"
                ? "bg-[#DCE9DD] border border-[#193F32] text-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                : "bg-transparent border border-[#E2D9C8] text-[#26332D] hover:bg-[#F4EFE3] hover:border-[#D8CEBD]"
            )}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#DF806B] shrink-0" />
            <span>Absent</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                attendanceFilter === "absent" ? "bg-[#193F32]/10 text-[#193F32]" : "bg-[#F4EFE3] text-[#5F6B62]"
              )}
            >
              {attendanceCounts.absent}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Roster List (Single Roster with 1px Hairlines on Ivory Background) */}
      <section aria-label="Class children roster">
        {/* Column Headers (quiet header row, hidden below 1024px) */}
        <div
          aria-hidden="true"
          className="hidden xl:grid grid-cols-[minmax(220px,2fr)_150px_1.2fr_1.2fr_120px_24px] items-center gap-4 px-4 pb-2.5 text-[12px] font-semibold text-[#5F6B62]"
        >
          <div>{t("children.col_child", "Child")}</div>
          <div>{t("children.col_level", "Level")}</div>
          <div>{t("children.col_strongest", "Strongest")}</div>
          <div>{t("children.col_needs", "Needs attention")}</div>
          <div>{t("children.col_attendance", "Attendance")}</div>
          <div />
        </div>

        {/* Loading Skeletons */}
        {loading && childrenList.length === 0 ? (
          <div className="divide-y divide-[#E2D9C8] border-t border-[#E2D9C8]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4 px-4 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-[#F4EFE3] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-[#F4EFE3]" />
                  <div className="h-3 w-20 rounded bg-[#F4EFE3]" />
                </div>
                <div className="h-2 w-24 rounded-full bg-[#F4EFE3] hidden sm:block" />
                <div className="h-4 w-20 rounded bg-[#F4EFE3] hidden md:block" />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          /* Empty State */
          <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-12 text-center text-[#5F6B62] shadow-[0_1px_2px_rgba(25,63,50,0.06)]">
            <h2 className="text-base font-bold text-[#26332D]">No children match your search</h2>
            <p className="text-sm text-[#5F6B62] mt-1">
              {q
                ? `No child found matching "${q}". Try clearing your search.`
                : "No children found matching the current attendance filter."}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {(q || attendanceFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setAttendanceFilter("all");
                  }}
                  className="rounded-[10px] bg-[#F4EFE3] border border-[#E2D9C8] px-4 py-2 text-xs font-bold text-[#193F32] hover:bg-[#EAE4D7] transition-colors cursor-pointer"
                >
                  Clear search and filters
                </button>
              )}
              {childrenList.length === 0 && (
                <button
                  type="button"
                  onClick={openAdd}
                  className="rounded-[10px] bg-[#193F32] px-4 py-2 text-xs font-bold text-[#FAF7EF] hover:bg-[#193F32]/90 transition-colors cursor-pointer"
                >
                  Add Child
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Active Roster List */
          <div className="divide-y divide-[#E2D9C8] border-t border-[#E2D9C8]">
            {filteredList.map((ch) => {
              const present = checkIsPresentToday(ch.id);
              const strong = domainOf(strongestDomain(ch));
              const weak = domainOf(weakestDomain(ch));
              const level = avgLevel(ch);

              return (
                <Link
                  key={ch.id}
                  to="/children/$id"
                  params={{ id: ch.id }}
                  data-testid={`child-row-${ch.id}`}
                  className="group block py-4 sm:py-5 px-3 sm:px-4 transition-colors duration-150 rounded-[12px] hover:bg-[#F4EFE3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32]"
                >
                  {/* Desktop Layout (>= 1280px): Clean single row with all 6 columns */}
                  <div className="hidden xl:grid grid-cols-[minmax(220px,2fr)_150px_1.2fr_1.2fr_120px_24px] items-center gap-4">
                    {/* a. ChildAvatar 48px + b. Name & Age */}
                    <div className="flex items-center gap-3 min-w-0">
                      <ChildAvatar child={ch} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px] font-semibold text-[#26332D] truncate leading-tight group-hover:text-[#193F32] transition-colors">
                          {ch.name}
                        </p>
                        <p className="text-[13px] text-[#5F6B62] mt-0.5 leading-none">
                          {ch.age} years
                        </p>
                      </div>
                    </div>

                    {/* c. Level Meter */}
                    <div
                      className="flex items-center gap-2.5 min-w-[120px]"
                      role="meter"
                      aria-valuenow={level}
                      aria-valuemin={1}
                      aria-valuemax={3}
                      aria-label={`Level ${level.toFixed(1)} out of 3`}
                    >
                      <div className="h-1.5 w-16 sm:w-20 rounded-full bg-[#EAE2D0] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#193F32] transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, (level / 3) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-semibold text-[#5F6B62] whitespace-nowrap">
                        {level.toFixed(1)} / 3
                      </span>
                    </div>

                    {/* d. Strongest */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium text-[#5F6B62]">Strongest</span>
                      <div className="flex items-center gap-1.5 min-w-0 pt-0.5">
                        {strong ? (
                          <>
                            <AreaIcon domain={strong.id} size={15} className="text-[#193F32] shrink-0" />
                            <span className="text-[13px] font-semibold text-[#26332D] truncate">
                              {strong.short}
                            </span>
                          </>
                        ) : (
                          <span className="text-[13px] text-[#5F6B62]">—</span>
                        )}
                      </div>
                    </div>

                    {/* e. Needs Attention */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium text-[#5F6B62] flex items-center gap-1">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#DF806B] shrink-0" />
                        <span>Needs attention</span>
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0 pt-0.5">
                        {weak ? (
                          <>
                            <AreaIcon domain={weak.id} size={15} className="text-[#193F32] shrink-0" />
                            <span className="text-[13px] font-semibold text-[#26332D] truncate">
                              {weak.short}
                            </span>
                          </>
                        ) : (
                          <span className="text-[13px] text-[#5F6B62]">—</span>
                        )}
                      </div>
                    </div>

                    {/* f. Attendance Dot + Label */}
                    <div className="flex items-center gap-1.5 text-[14px] font-medium text-[#26332D]">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          present ? "bg-[#193F32]" : "bg-[#DF806B]"
                        )}
                      />
                      <span>{present ? "Present" : "Absent"}</span>
                    </div>

                    {/* g. Chevron-right Icon */}
                    <div className="flex justify-end">
                      <ChevronRight
                        aria-hidden="true"
                        size={18}
                        className="text-[#5F6B62] shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                      />
                    </div>
                  </div>

                  {/* Tablet Layout (768px - 1279px): Two-line clean row */}
                  <div className="hidden md:flex xl:hidden flex-col gap-2.5">
                    {/* Line 1: Avatar, Name/Age, and Attendance */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <ChildAvatar child={ch} size="lg" />
                        <div className="min-w-0">
                          <p className="text-[17px] font-semibold text-[#26332D] truncate leading-tight group-hover:text-[#193F32] transition-colors">
                            {ch.name}
                          </p>
                          <p className="text-[13px] text-[#5F6B62] mt-0.5 leading-none">
                            {ch.age} years
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 text-[14px] font-medium text-[#26332D]">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              present ? "bg-[#193F32]" : "bg-[#DF806B]"
                            )}
                          />
                          <span>{present ? "Present" : "Absent"}</span>
                        </div>
                        <ChevronRight
                          aria-hidden="true"
                          size={18}
                          className="text-[#5F6B62] shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                        />
                      </div>
                    </div>

                    {/* Line 2: Level meter and Strongest / Needs Attention */}
                    <div className="flex flex-wrap items-center gap-6 pl-[60px] text-sm">
                      {/* Level */}
                      <div
                        className="flex items-center gap-2"
                        role="meter"
                        aria-valuenow={level}
                        aria-valuemin={1}
                        aria-valuemax={3}
                        aria-label={`Level ${level.toFixed(1)} out of 3`}
                      >
                        <span className="text-[12px] text-[#5F6B62]">Level</span>
                        <div className="h-1.5 w-16 rounded-full bg-[#EAE2D0] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#193F32]"
                            style={{ width: `${Math.min(100, Math.max(0, (level / 3) * 100))}%` }}
                          />
                        </div>
                        <span className="text-[13px] font-semibold text-[#5F6B62]">
                          {level.toFixed(1)}/3
                        </span>
                      </div>

                      {/* Strongest */}
                      {strong && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] text-[#5F6B62]">Strongest:</span>
                          <AreaIcon domain={strong.id} size={14} className="text-[#193F32]" />
                          <span className="text-[13px] font-semibold text-[#26332D]">
                            {strong.short}
                          </span>
                        </div>
                      )}

                      {/* Needs attention */}
                      {weak && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] text-[#5F6B62] flex items-center gap-1">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#DF806B]" />
                            <span>Needs attention:</span>
                          </span>
                          <AreaIcon domain={weak.id} size={14} className="text-[#193F32]" />
                          <span className="text-[13px] font-semibold text-[#26332D]">
                            {weak.short}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile Layout (< 768px): Stacked clean row */}
                  <div className="flex md:hidden flex-col gap-3">
                    {/* Line 1: Avatar, Name, Age, and Attendance dot + text */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <ChildAvatar child={ch} size="lg" />
                        <div className="min-w-0">
                          <p className="text-[16px] font-semibold text-[#26332D] truncate leading-tight group-hover:text-[#193F32] transition-colors">
                            {ch.name}
                          </p>
                          <p className="text-[12px] text-[#5F6B62] mt-0.5 leading-none">
                            {ch.age} years
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#26332D]">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              present ? "bg-[#193F32]" : "bg-[#DF806B]"
                            )}
                          />
                          <span>{present ? "Present" : "Absent"}</span>
                        </div>
                        <ChevronRight
                          aria-hidden="true"
                          size={16}
                          className="text-[#5F6B62] shrink-0"
                        />
                      </div>
                    </div>

                    {/* Line 2: Level Meter */}
                    <div
                      className="flex items-center gap-2 pl-[60px]"
                      role="meter"
                      aria-valuenow={level}
                      aria-valuemin={1}
                      aria-valuemax={3}
                      aria-label={`Level ${level.toFixed(1)} out of 3`}
                    >
                      <span className="text-[11px] text-[#5F6B62]">Level</span>
                      <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-[#EAE2D0] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#193F32]"
                          style={{ width: `${Math.min(100, Math.max(0, (level / 3) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-[#5F6B62]">
                        {level.toFixed(1)}/3
                      </span>
                    </div>

                    {/* Line 3: Strongest & Needs Attention */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-[60px] text-xs">
                      {strong && (
                        <div className="flex items-center gap-1">
                          <span className="text-[#5F6B62]">Strongest:</span>
                          <AreaIcon domain={strong.id} size={13} className="text-[#193F32]" />
                          <span className="font-semibold text-[#26332D]">{strong.short}</span>
                        </div>
                      )}
                      {weak && (
                        <div className="flex items-center gap-1">
                          <span className="text-[#5F6B62] flex items-center gap-1">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#DF806B]" />
                            <span>Needs attention:</span>
                          </span>
                          <AreaIcon domain={weak.id} size={13} className="text-[#193F32]" />
                          <span className="font-semibold text-[#26332D]">{weak.short}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Add Child Right-Side Drawer (Radix Dialog Modal with Scrim and Focus Trap) */}
      <DialogPrimitive.Root
        open={!!add}
        onOpenChange={(open) => {
          if (!open) closeAdd();
        }}
      >
        <DialogPrimitive.Portal>
          {/* Soft Scrim Backdrop */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#26332D]/25 backdrop-blur-[1px] transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:transition-none" />

          {/* Drawer Sheet (Right-side 420px, left border, 16px radius on left corners, full screen on mobile) */}
          <DialogPrimitive.Content
            aria-describedby="add-child-desc"
            className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col justify-between border-l border-[#E2D9C8] bg-[#FFFDF8] p-6 shadow-[0_4px_24px_rgba(25,63,50,0.12)] transition-transform duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right motion-reduce:transition-none sm:max-w-[420px] sm:rounded-l-[16px]"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2D9C8]">
                <div>
                  <DialogPrimitive.Title className="font-display text-xl font-bold text-[#193F32]">
                    Add a child
                  </DialogPrimitive.Title>
                  <p id="add-child-desc" className="text-xs text-[#5F6B62] mt-0.5">
                    Enter the child's details to add them to class records.
                  </p>
                </div>
                <DialogPrimitive.Close
                  type="button"
                  onClick={closeAdd}
                  className="rounded-full p-2 text-[#5F6B62] hover:bg-[#F4EFE3] hover:text-[#26332D] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#193F32]"
                  aria-label="Close add child drawer"
                >
                  <X className="h-5 w-5" />
                </DialogPrimitive.Close>
              </div>

              {/* Form Content */}
              <form id="add-child-form" onSubmit={handleAddChild} className="space-y-5">
                {/* Child Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="child-name-input"
                    className="block text-xs font-bold text-[#5F6B62] uppercase tracking-wide"
                  >
                    Child's name
                  </label>
                  <input
                    id="child-name-input"
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Priya"
                    className={cn(
                      "h-[48px] w-full rounded-[10px] border border-[#E2D9C8] bg-white px-3.5 text-sm font-medium text-[#26332D] placeholder-[#5F6B62]/60 outline-none transition-colors",
                      "focus:border-[#193F32] focus:ring-2 focus:ring-[#193F32]",
                      formError && "border-[#DF806B] focus:ring-[#DF806B]"
                    )}
                  />
                  {formError && (
                    <p className="text-[13px] font-semibold text-[#DF806B] pt-0.5 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{formError}</span>
                    </p>
                  )}
                </div>

                {/* Age Segmented Control (3, 4, 5) with 48px buttons */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#5F6B62] uppercase tracking-wide">
                    Age
                  </label>
                  <div
                    role="group"
                    aria-label="Select age"
                    className="grid grid-cols-3 gap-2"
                  >
                    {[3, 4, 5].map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAge(a)}
                        className={cn(
                          "h-[48px] rounded-[10px] text-sm font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#193F32]",
                          age === a
                            ? "bg-[#193F32] text-white shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                            : "bg-[#F4EFE3] border border-[#E2D9C8] text-[#26332D] hover:bg-[#EAE4D7]"
                        )}
                      >
                        {a} years
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer with Save (solid forest green 48px) and Cancel (quiet outline) */}
            <div className="pt-4 border-t border-[#E2D9C8] flex items-center gap-3">
              <button
                type="button"
                onClick={closeAdd}
                className="h-[48px] flex-1 rounded-[10px] border border-[#E2D9C8] bg-transparent text-sm font-bold text-[#26332D] hover:bg-[#F4EFE3] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#193F32]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-child-form"
                disabled={!name.trim() || isSubmitting}
                className={cn(
                  "h-[48px] flex-1 rounded-[10px] text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32]",
                  name.trim() && !isSubmitting
                    ? "bg-[#193F32] text-white hover:bg-[#193F32]/90 shadow-[0_1px_2px_rgba(25,63,50,0.06)] cursor-pointer"
                    : "bg-[#F4EFE3] text-[#5F6B62] border border-[#E2D9C8] cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
