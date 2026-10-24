import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus,
  PenLine,
  ArrowRight,
  ArrowUpRight,
  Sun,
  CalendarCheck,
  Users,
  HeartHandshake,
  Trophy,
  Target,
  Play,
  Sprout,
  Leaf,
  TreeDeciduous,
  Lightbulb,
  Shapes,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { useStore, isPresentToday } from "@/lib/store";
import {
  DOMAINS,
  needsAttention,
  recommendFor,
  domainOf,
  avgLevel,
  dateKey,
  type Child,
  type DomainId,
} from "@/lib/data";
import { ChildAvatar } from "@/components/ChildAvatar";
import { AreaIcon, ActivityIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { PageLoader } from "@/components/PageLoader";
import { useI18n } from "@/lib/i18n";

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 600);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — VikasSetu" },
      {
        name: "description",
        content: "Today's focus: which children need support and what activity to do next.",
      },
      { property: "og:title", content: "Dashboard — VikasSetu" },
      {
        property: "og:description",
        content: "Today's focus: which children need support and what activity to do next.",
      },
    ],
  }),
  component: Dashboard,
});

interface DashboardSummaryData {
  totalChildren: number;
  presentToday: number;
  needsAttentionCount: number;
  activitiesDone: number;
  attentionList: Child[];
  domainDistribution: Record<DomainId, Record<number, number>>;
}

function Dashboard() {
  const { t } = useI18n();
  const { children, observations, attendance, completed } = useStore();
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<DashboardSummaryData>("/dashboard/summary")
      .then((data) => {
        if (!active || !data) return;
        setSummary(data);
      })
      .catch((err) => {
        console.warn("Could not fetch /dashboard/summary from backend, using store data:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Compute values: prioritize live backend summary, fallback to client store
  if (children.length === 0 && !summary) {
    return <PageLoader fullScreen={false} message="Loading classroom dashboard…" />;
  }

  const storePresent = children.filter((c) => isPresentToday(attendance, c.id)).length;
  const storeAttention = children.filter(needsAttention);
  const storeFocus = [...children].sort((a, b) => avgLevel(a) - avgLevel(b)).slice(0, 3);

  const totalChildrenCount = summary?.totalChildren ?? children.length;
  const presentCount = summary?.presentToday ?? storePresent;
  const absentCount = Math.max(0, totalChildrenCount - presentCount);
  const needsAttentionCount = summary?.needsAttentionCount ?? storeAttention.length;
  const activitiesDoneCount = summary?.activitiesDone ?? completed;
  const focusChildren =
    summary?.attentionList && summary.attentionList.length > 0
      ? summary.attentionList.slice(0, 3)
      : storeFocus;

  // Filter absent children for right rail avatar strip
  const todayKey = dateKey(new Date());
  const absentChildren = children.filter((c) => attendance[c.id]?.[todayKey] === false || !isPresentToday(attendance, c.id));

  const hour = new Date().getHours();
  const greet = hour < 12 ? t("dash.good_morning", "Good morning") : hour < 17 ? t("dash.good_afternoon", "Good afternoon") : t("dash.good_evening", "Good evening");

  const stats = [
    {
      id: "total-children",
      label: t("metric.enrolled", "Total enrolled"),
      value: totalChildrenCount,
      scope: "Enrolled in class",
      icon: Users,
      to: "/children",
      isAttendanceRing: false,
    },
    {
      id: "present-today",
      label: t("metric.present", "Present today"),
      value: presentCount,
      scope: `${presentCount} of ${totalChildrenCount || 0} children marked present`,
      icon: CalendarCheck,
      to: "/attendance",
      isAttendanceRing: true,
    },
    {
      id: "need-attention",
      label: t("metric.needs_attention", "Need attention"),
      value: needsAttentionCount,
      scope: "Children with low scores needing tailored support",
      icon: HeartHandshake,
      to: "/recommendations",
      isAttendanceRing: false,
    },
    {
      id: "activities-done",
      label: t("metric.activities_done", "Activities logged"),
      value: activitiesDoneCount,
      scope: "Guided activities and trials completed",
      icon: Trophy,
      to: "/progress",
      isAttendanceRing: false,
    },
  ];

  return (
    <div className="fade-up mx-auto max-w-6xl space-y-9 pb-16 text-[#26332D]">
      {/* 1. Hero banner (300-340px desktop, solid forest #193F32 with soft #1F4A3B radial, inverted cream line art) */}
      <section
        aria-label="Welcome banner"
        className="relative overflow-hidden rounded-[24px] border border-[#193F32] p-6 sm:p-9 md:p-10 text-[#FAF7EF] shadow-[0_1px_2px_rgba(25,63,50,0.06)] min-h-[300px] md:min-h-[330px] flex items-center"
        style={{
          background: "radial-gradient(circle at 85% 35%, #1F4A3B 0%, #193F32 72%)",
        }}
      >
        {/* Faint subtle grain overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Right side artwork: User uploaded classroom sketch inverted + screen blend + edge fade */}
        {!heroImgFailed && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-full sm:w-1/2 md:w-[48%] overflow-hidden">
            <img
              src="/dashboard-hero-sketch.png"
              alt=""
              onError={() => setHeroImgFailed(true)}
              className="h-full w-full object-cover object-center opacity-45 mix-blend-screen [filter:invert(1)] [mask-image:radial-gradient(ellipse_at_65%_50%,black_30%,transparent_80%)]"
            />
          </div>
        )}

        {/* Decorative floating leaf shapes in sage #DCE9DD at 12% opacity */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-4 right-8 text-[#DCE9DD] opacity-[0.12] hidden md:block animate-[heroFloat_7s_ease-in-out_infinite]"
        >
          <Leaf className="h-10 w-10 rotate-12" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-5 right-[42%] text-[#DCE9DD] opacity-[0.10] hidden lg:block animate-[heroFloat_8s_ease-in-out_infinite_reverse]"
        >
          <Sprout className="h-9 w-9 -rotate-12" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-12 left-[48%] text-[#DCE9DD] opacity-[0.08] hidden xl:block animate-[heroFloat_6.5s_ease-in-out_infinite]"
        >
          <Leaf className="h-7 w-7 rotate-45" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-xl space-y-4">
          {/* Frosted greeting chip */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FAF7EF]/25 bg-[#FAF7EF]/15 px-3.5 py-1 text-xs sm:text-sm font-bold text-[#FAF7EF] backdrop-blur-[6px] shadow-xs">
            <Sun className="h-4 w-4 text-[#FAF7EF] shrink-0" aria-hidden="true" />
            <span>{greet}, {t("dash.teacher", "Teacher")}</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold tracking-tight text-[#FAF7EF] text-[clamp(2.1rem,4.5vw,3.25rem)] leading-[1.08]">
            {t("dash.headline_prefix", "What should I do")} <span className="text-[#DF806B]">{t("dash.headline_highlight", "today?")}</span>
          </h1>

          {/* Subtext */}
          <p className="text-[#FAF7EF]/85 text-sm sm:text-base leading-relaxed max-w-[52ch]">
            {focusChildren.length > 0 ? (
              <>
                <span className="font-bold text-[#FAF7EF]">{focusChildren.length} {t("nav.children", "children")}</span>
                {t("dash.support_notice", "could use a little extra support today. Start with them.")}
              </>
            ) : (
              "Every child learns differently. Observe and record today's class progress."
            )}
          </p>

          {/* Action buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/progress"
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[12px] bg-[#FAF7EF] text-[#193F32] font-bold text-sm sm:text-base transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(25,63,50,0.15)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF7EF]"
            >
              <PenLine className="h-4 w-4" aria-hidden="true" />
              <span>{t("dash.record_obs", "Record Observation")}</span>
            </Link>
            <Link
              to="/children"
              search={{ add: true }}
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[12px] border border-[#FAF7EF]/50 bg-transparent text-[#FAF7EF] font-bold text-sm sm:text-base transition-all duration-150 hover:bg-[#FAF7EF]/12 hover:border-[#FAF7EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF7EF]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{t("dash.add_child", "Add Child")}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Stat tiles (Four compact tiles, 4 cols desktop, 2 cols mobile, 16px radius, hover lift) */}
      <section aria-label="Classroom key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const IconComponent = s.icon;
          return (
            <Link
              key={s.id}
              to={s.to}
              title={s.scope}
              aria-label={`${s.label}: ${s.value}. ${s.scope}`}
              className="group relative flex flex-col justify-between rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-5 shadow-[0_1px_2px_rgba(25,63,50,0.06)] hover:shadow-[0_8px_24px_rgba(25,63,50,0.10)] hover:-translate-y-0.5 transition-all duration-200 min-h-[122px] sm:min-h-[132px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32]"
            >
              <div className="flex items-center justify-between">
                {s.isAttendanceRing ? (
                  /* 40px circular progress ring for present/total */
                  <div className="relative h-10 w-10 shrink-0" aria-hidden="true">
                    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#E2D9C8]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#2F7D4F] transition-all duration-700 ease-out"
                        strokeDasharray={`${totalChildrenCount > 0 ? (presentCount / totalChildrenCount) * 100 : 0}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[#193F32]">
                      <CalendarCheck className="h-4 w-4" />
                    </div>
                  </div>
                ) : (
                  /* 40px sage tile */
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#DCE9DD] text-[#193F32]"
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                )}
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-4 w-4 text-[#5F6B62] opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </div>

              <div className="mt-3">
                <p className="font-display text-[28px] sm:text-[32px] font-bold leading-none tracking-tight text-[#26332D]">
                  <CountUp value={s.value} />
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[#5F6B62] leading-tight">
                  {s.label}
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      {/* 3 & 4. Today's Focus Section with subtle cream band (#F4EFE3 at 50%) */}
      <section
        aria-labelledby="todays-focus-heading"
        className="rounded-[20px] bg-[#F4EFE3]/50 p-4 sm:p-6 border border-[#E2D9C8]/60 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#193F32]" aria-hidden="true" />
              <h2
                id="todays-focus-heading"
                className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-[#26332D]"
              >
                {t("focus.title", "Today's Focus")}
              </h2>
            </div>
            {/* Short coral underline accent (3px high, 32px wide) */}
            <div className="mt-1 h-[3px] w-8 rounded-full bg-[#DF806B]" aria-hidden="true" />
            <p className="mt-1.5 text-sm text-[#5F6B62]">
              {t("focus.subtitle", "Children who may benefit from extra guidance today")}
            </p>
          </div>
          <Link
            to="/recommendations"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#193F32] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] rounded-[6px]"
          >
            <span>{t("focus.all_recs", "All recommendations")}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Focus cards grid (3 cols desktop, 2 tablet, 1 mobile) */}
        {focusChildren.length === 0 ? (
          <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-8 text-center space-y-2">
            <CheckCircle className="h-8 w-8 text-[#2F7D4F] mx-auto" aria-hidden="true" />
            <p className="font-bold text-base text-[#26332D]">No one needs extra support today</p>
            <p className="text-sm text-[#5F6B62]">
              All children are progressing well. Explore class activities or record observations.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {focusChildren.map((ch, idx) => {
              const rec = recommendFor(ch, observations)[0];
              if (!rec) return null;
              const dom = domainOf(rec.domain);

              return (
                <div
                  key={ch.id}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className="flex flex-col justify-between rounded-[16px] border border-[#E2D9C8] border-l-4 border-l-[#DF806B] bg-[#FFFDF8] p-5 shadow-[0_1px_2px_rgba(25,63,50,0.06)] hover:shadow-[0_8px_24px_rgba(25,63,50,0.10)] hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div>
                    {/* Child Header: Avatar 44px + Name + Level */}
                    <Link
                      to="/children/$id"
                      params={{ id: ch.id }}
                      className="group flex items-center gap-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] rounded-[8px]"
                    >
                      <ChildAvatar child={ch} size="md" />
                      <div className="min-w-0">
                        <p className="font-display text-[17px] font-bold text-[#26332D] leading-tight group-hover:text-[#193F32] transition-colors truncate">
                          {ch.name}
                        </p>
                        <p className="text-[13px] font-semibold text-[#5F6B62] mt-0.5 leading-none">
                          Level {rec.level}/3 in {dom?.name ?? rec.domain}
                        </p>
                      </div>
                    </Link>

                    {/* 3-segment level meter */}
                    <div
                      role="meter"
                      aria-valuenow={rec.level}
                      aria-valuemin={1}
                      aria-valuemax={3}
                      aria-label={`Level ${rec.level} of 3 in ${dom?.name}`}
                      className="mt-3 flex items-center gap-1.5"
                    >
                      {[1, 2, 3].map((lvl) => (
                        <span
                          key={lvl}
                          className={cn(
                            "h-1.5 w-6 rounded-full transition-colors",
                            lvl <= rec.level ? "bg-[#2F7D4F]" : "bg-[#EAE2D0]"
                          )}
                        />
                      ))}
                    </div>

                    {/* Area with <AreaIcon> as plain text (no pastel chip) */}
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#5F6B62]">
                      <AreaIcon domain={rec.domain} size={15} />
                      <span className="truncate">{dom?.name}</span>
                    </div>

                    {/* Need line in regular weight (no bold "Need:" label) */}
                    <p className="mt-2 text-xs sm:text-sm text-[#5F6B62] leading-relaxed">
                      {ch.needs?.[0] ? ch.needs[0] : `Needs practice in ${dom?.name}`}
                    </p>

                    {/* Suggested activity panel in cream #F4EFE3 */}
                    <div className="mt-4 rounded-[12px] bg-[#F4EFE3] p-3.5 space-y-1.5 border border-[#E2D9C8]/60">
                      <p className="text-[12px] font-semibold text-[#5F6B62] leading-none">
                        Suggested activity
                      </p>
                      <div className="flex items-center gap-2.5 pt-0.5">
                        <ActivityIcon
                          activity={rec.activity}
                          tile
                          tint="sage"
                          tileClassName="h-9 w-9 rounded-[8px]"
                          size={18}
                        />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[#26332D] leading-snug truncate">
                            {rec.activity.name}
                          </p>
                          <p className="text-xs text-[#5F6B62] mt-0.5">
                            {rec.activity.minutes} mins · {rec.activity.difficulty}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Start + View Plan */}
                  <div className="mt-5 flex items-center justify-between gap-3 pt-2">
                    <Link
                      to="/activities/$id"
                      params={{ id: rec.activity.id }}
                      search={{ child: ch.id }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#193F32] text-[#FAF7EF] font-bold text-sm shadow-[0_1px_2px_rgba(25,63,50,0.06)] hover:bg-[#1F4A3B] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#193F32]"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>Start</span>
                    </Link>
                    <Link
                      to="/recommendations"
                      className="text-xs sm:text-sm font-semibold text-[#193F32] hover:text-[#1F4A3B] hover:underline px-2 py-1 rounded-[6px]"
                    >
                      View Plan
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5 & 6. Two-column grid (Class Learning Overview 65% + Right Rail 35% on desktop xl:) */}
      <section aria-label="Class progress and quick actions" className="grid grid-cols-1 xl:grid-cols-[1.85fr_1fr] gap-6 items-start">
        {/* 5. Class learning overview */}
        <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-5 sm:p-6 shadow-[0_1px_2px_rgba(25,63,50,0.06)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#26332D]">
                Class learning overview
              </h2>
              <p className="text-xs sm:text-sm text-[#5F6B62] mt-0.5">
                Children at each level across the 5 early learning areas
              </p>
            </div>
          </div>

          {/* Moved legend to top with Sprout, Leaf, TreeDeciduous icons and level dots */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-xs font-semibold text-[#5F6B62] pb-3 border-b border-[#E2D9C8]">
            <span className="text-[12px] font-bold text-[#26332D]">Levels:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#DF806B]" aria-hidden="true" />
              <Sprout className="h-3.5 w-3.5 text-[#DF806B]" aria-hidden="true" />
              <span>Needs support</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E0B456]" aria-hidden="true" />
              <Leaf className="h-3.5 w-3.5 text-[#E0B456]" aria-hidden="true" />
              <span>Developing</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2F7D4F]" aria-hidden="true" />
              <TreeDeciduous className="h-3.5 w-3.5 text-[#2F7D4F]" aria-hidden="true" />
              <span>Good</span>
            </span>
          </div>

          {/* Area rows */}
          <div className="space-y-4 pt-1">
            {DOMAINS.map((d) => {
              const counts = [1, 2, 3].map((lvl) => {
                if (summary?.domainDistribution?.[d.id]) {
                  return summary.domainDistribution[d.id][lvl] || 0;
                }
                return children.filter((c) => c.scores[d.id] === lvl).length;
              });
              const count1 = counts[0] ?? 0;
              const count2 = counts[1] ?? 0;
              const count3 = counts[2] ?? 0;
              const total = totalChildrenCount || 1;
              const doingWell = count3;

              return (
                <div key={d.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-bold text-[#26332D]">
                      <AreaIcon domain={d.id} size={16} />
                      <span>{d.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-[#26332D]">
                      {doingWell} of {totalChildrenCount} doing well
                    </span>
                  </div>

                  {/* Bars: 12px tall, 6px radius, 2px gaps between segments */}
                  <div className="flex h-3 w-full gap-[2px] rounded-[6px] overflow-hidden bg-[#F4EFE3]">
                    {count1 > 0 && (
                      <div
                        title={`${count1} ${count1 === 1 ? "child" : "children"} · Needs support`}
                        className="h-full bg-[#DF806B] transition-all duration-700 ease-out flex items-center justify-center text-[10px] font-bold text-white overflow-hidden rounded-[2px]"
                        style={{ width: `${(count1 / total) * 100}%` }}
                      >
                        {count1 / total >= 0.12 && <span>{count1}</span>}
                      </div>
                    )}
                    {count2 > 0 && (
                      <div
                        title={`${count2} ${count2 === 1 ? "child" : "children"} · Developing`}
                        className="h-full bg-[#E0B456] transition-all duration-700 ease-out flex items-center justify-center text-[10px] font-bold text-[#26332D] overflow-hidden rounded-[2px]"
                        style={{ width: `${(count2 / total) * 100}%` }}
                      >
                        {count2 / total >= 0.12 && <span>{count2}</span>}
                      </div>
                    )}
                    {count3 > 0 && (
                      <div
                        title={`${count3} ${count3 === 1 ? "child" : "children"} · Good`}
                        className="h-full bg-[#2F7D4F] transition-all duration-700 ease-out flex items-center justify-center text-[10px] font-bold text-white overflow-hidden rounded-[2px]"
                        style={{ width: `${(count3 / total) * 100}%` }}
                      >
                        {count3 / total >= 0.12 && <span>{count3}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Stacked Right Rail (Today in class + Quick actions) */}
        <div className="space-y-6">
          {/* Today in class card */}
          <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-5 shadow-[0_1px_2px_rgba(25,63,50,0.06)] space-y-4">
            <h3 className="font-display text-lg font-bold text-[#26332D]">Today in class</h3>

            <div className="flex items-center gap-4">
              {/* Attendance ring */}
              <div className="relative h-12 w-12 shrink-0" aria-hidden="true">
                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#E2D9C8]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#2F7D4F] transition-all duration-700 ease-out"
                    strokeDasharray={`${totalChildrenCount > 0 ? (presentCount / totalChildrenCount) * 100 : 0}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#26332D]">
                  {totalChildrenCount > 0 ? Math.round((presentCount / totalChildrenCount) * 100) : 0}%
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-[#26332D] flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#2F7D4F]" aria-hidden="true" />
                    <span>{presentCount} present</span>
                  </span>
                  <span className="text-[#5F6B62]">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#C94A3F]" aria-hidden="true" />
                    <span>{absentCount} absent</span>
                  </span>
                </p>
                <p className="text-xs text-[#5F6B62] mt-0.5">Daily roll call record</p>
              </div>
            </div>

            {/* Row of absent children */}
            {absentChildren.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-semibold text-[#5F6B62] mb-1.5">Absent today:</p>
                <div className="flex items-center -space-x-1.5 overflow-hidden">
                  {absentChildren.slice(0, 5).map((c) => (
                    <div key={c.id} title={c.name} className="ring-2 ring-[#FFFDF8] rounded-full">
                      <ChildAvatar child={c} size="sm" />
                    </div>
                  ))}
                  {absentChildren.length > 5 && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4EFE3] text-xs font-bold text-[#5F6B62] ring-2 ring-[#FFFDF8]">
                      +{absentChildren.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}

            <Link
              to="/attendance"
              className="inline-flex items-center justify-between w-full pt-3 border-t border-[#E2D9C8] text-sm font-bold text-[#193F32] hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#193F32] rounded-[6px]"
            >
              <span className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                <span>Take attendance</span>
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Quick actions card */}
          <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-5 shadow-[0_1px_2px_rgba(25,63,50,0.06)] space-y-3">
            <h3 className="font-display text-lg font-bold text-[#26332D]">Quick actions</h3>

            <div className="space-y-1">
              <Link
                to="/progress"
                className="flex items-center justify-between h-12 px-3 rounded-[10px] hover:bg-[#F4EFE3] transition-colors group text-sm font-semibold text-[#26332D] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#193F32]"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#DCE9DD] text-[#193F32]"
                  >
                    <PenLine className="h-4 w-4" />
                  </span>
                  <span>Record observation</span>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 text-[#5F6B62] group-hover:translate-x-0.5 transition-transform"
                />
              </Link>

              <Link
                to="/children"
                search={{ add: true }}
                className="flex items-center justify-between h-12 px-3 rounded-[10px] hover:bg-[#F4EFE3] transition-colors group text-sm font-semibold text-[#26332D] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#193F32]"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#DCE9DD] text-[#193F32]"
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                  <span>Add child</span>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 text-[#5F6B62] group-hover:translate-x-0.5 transition-transform"
                />
              </Link>

              <Link
                to="/recommendations"
                className="flex items-center justify-between h-12 px-3 rounded-[10px] hover:bg-[#F4EFE3] transition-colors group text-sm font-semibold text-[#26332D] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#193F32]"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#DCE9DD] text-[#193F32]"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </span>
                  <span>View recommendations</span>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 text-[#5F6B62] group-hover:translate-x-0.5 transition-transform"
                />
              </Link>

              <Link
                to="/activities"
                className="flex items-center justify-between h-12 px-3 rounded-[10px] hover:bg-[#F4EFE3] transition-colors group text-sm font-semibold text-[#26332D] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#193F32]"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#DCE9DD] text-[#193F32]"
                  >
                    <Shapes className="h-4 w-4" />
                  </span>
                  <span>Browse activities</span>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 text-[#5F6B62] group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
