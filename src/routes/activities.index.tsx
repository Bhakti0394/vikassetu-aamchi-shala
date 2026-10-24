import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Clock, Signal, ArrowRight } from "lucide-react";
import { ACTIVITIES, DOMAINS, domainOf, type DomainId, type Activity } from "@/lib/data";
import { AreaIcon, ActivityIcon } from "@/lib/icons";
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

  const list = useMemo(() => {
    return ACTIVITIES.filter((a) => filter === "all" || a.domain === filter);
  }, [filter]);

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ACTIVITIES.length };
    DOMAINS.forEach((d) => {
      counts[d.id] = ACTIVITIES.filter((a) => a.domain === d.id).length;
    });
    return counts;
  }, []);

  return (
    <div className="fade-up mx-auto max-w-7xl space-y-6 pb-16 text-[#26332D]">
      {/* 1. Page Header (Solid forest-green, no gradient, calm typography) */}
      <header className="space-y-1.5 pt-1">
        <p className="text-[12px] font-bold uppercase tracking-wider text-[#193F32]">
          Activity library
        </p>
        <h1 className="font-display text-[28px] sm:text-[32px] font-bold tracking-tight text-[#193F32] leading-tight">
          Activities
        </h1>
        <p className="text-[14px] text-[#5F6B62] leading-relaxed max-w-[65ch]">
          Short, low-cost activities you can do with everyday classroom materials.
        </p>
      </header>

      {/* 2. Compact Segmented Filter Row (Wrap/scroll inside container, no horizontal page overflow) */}
      <div
        className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 pt-1 no-scrollbar sm:flex-wrap"
        role="tablist"
        aria-label="Filter activities by learning area"
      >
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          onClick={() => setFilter("all")}
          className={cn(
            "inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-[13px] font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] cursor-pointer min-h-[44px] shrink-0",
            filter === "all"
              ? "bg-[#DCE9DD] border border-[#193F32] text-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
              : "bg-transparent border border-[#E2D9C8] text-[#26332D] hover:bg-[#F4EFE3] hover:border-[#D8CEBD]"
          )}
        >
          <AreaIcon
            domain="all"
            size={16}
            strokeWidth={1.75}
            className={filter === "all" ? "text-[#193F32]" : "text-[#5F6B62]"}
          />
          <span>All</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
              filter === "all"
                ? "bg-[#193F32]/10 text-[#193F32]"
                : "bg-[#F4EFE3] text-[#5F6B62]"
            )}
          >
            {domainCounts["all"]}
          </span>
        </button>

        {DOMAINS.map((d) => {
          const isSelected = filter === d.id;
          const count = domainCounts[d.id] ?? 0;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setFilter(d.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-[13px] font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] cursor-pointer min-h-[44px] shrink-0",
                isSelected
                  ? "bg-[#DCE9DD] border border-[#193F32] text-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                  : "bg-transparent border border-[#E2D9C8] text-[#26332D] hover:bg-[#F4EFE3] hover:border-[#D8CEBD]"
              )}
            >
              <AreaIcon
                domain={d.id}
                size={16}
                strokeWidth={1.75}
                className={isSelected ? "text-[#193F32]" : "text-[#5F6B62]"}
              />
              <span>{d.short}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                  isSelected
                    ? "bg-[#193F32]/10 text-[#193F32]"
                    : "bg-[#F4EFE3] text-[#5F6B62]"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Activity Cards Grid (3 cols >= 1280px, 2 cols 768-1279px, 1 col below) */}
      {list.length === 0 ? (
        <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-12 text-center text-[#5F6B62] shadow-[0_1px_2px_rgba(25,63,50,0.06)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#F4EFE3] text-[#193F32] mb-3">
            <AreaIcon domain="all" size={24} />
          </div>
          <h3 className="text-base font-bold text-[#26332D]">No activities found</h3>
          <p className="text-sm text-[#5F6B62] mt-1">
            There are no activities matching the selected filter.
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-4 rounded-[10px] bg-[#F4EFE3] border border-[#E2D9C8] px-4 py-2 text-xs font-bold text-[#193F32] hover:bg-[#EAE4D7] transition-colors cursor-pointer"
          >
            Show all activities
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((a, idx) => (
            <ActivityCard key={a.id} activity={a} isAltTint={idx % 2 === 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityCard({
  activity: a,
  isAltTint,
}: {
  activity: Activity;
  isAltTint?: boolean;
}) {
  const d = domainOf(a.domain);

  return (
    <article
      data-testid={`activity-card-${a.id}`}
      className="flex flex-col justify-between rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-5 shadow-[0_1px_2px_rgba(25,63,50,0.06)] hover:border-[#193F32]/40 hover:shadow-[0_4px_12px_rgba(25,63,50,0.08)] transition-all duration-150 motion-reduce:transition-none h-full"
    >
      <div className="space-y-3.5">
        {/* a. Icon Tile (40-44px, sage or cream tint, forest-green Lucide icon) beside muted category label */}
        <div className="flex items-center gap-3">
          <ActivityIcon
            activity={a}
            tile
            tint={isAltTint ? "cream" : "sage"}
            size={24}
            tileClassName="h-11 w-11 rounded-[12px]"
          />
          <span className="text-[12px] font-semibold text-[#5F6B62] truncate">
            {d?.name ?? a.domain}
          </span>
        </div>

        {/* b. Activity Title: 17-18px semibold, strongest text */}
        <h2 className="text-[17px] sm:text-[18px] font-semibold text-[#26332D] leading-snug line-clamp-2">
          {a.name}
        </h2>

        {/* c. Meta Row: Clock + min, Signal + difficulty (single dot separator) */}
        <div className="flex items-center gap-2 text-[13px] text-[#5F6B62]">
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" size={15} strokeWidth={1.75} className="text-[#5F6B62]" />
            <span>{a.minutes} min</span>
          </span>
          <span aria-hidden="true" className="text-[#E2D9C8]">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Signal aria-hidden="true" size={15} strokeWidth={1.75} className="text-[#5F6B62]" />
            <span>{a.difficulty}</span>
          </span>
        </div>

        {/* d. Up to 2 skill tags as quiet cream chips (#F4EFE3, dark text 12-13px). If more, show +N */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {a.skills.slice(0, 2).map((skill) => (
            <span
              key={skill}
              className="rounded-[8px] bg-[#F4EFE3] border border-[#E2D9C8]/60 px-2.5 py-1 text-[12px] font-medium text-[#26332D] max-w-full truncate"
            >
              {skill}
            </span>
          ))}
          {a.skills.length > 2 && (
            <span
              className="rounded-[8px] bg-[#F4EFE3] border border-[#E2D9C8]/60 px-2 py-1 text-[12px] font-medium text-[#5F6B62]"
              title={a.skills.slice(2).join(", ")}
            >
              +{a.skills.length - 2}
            </span>
          )}
        </div>
      </div>

      {/* e. Footer: compact solid forest-green "Start" button with ArrowRight icon */}
      <div className="pt-4 mt-auto flex items-center justify-end">
        <Link
          to="/activities/$id"
          params={{ id: a.id }}
          search={{}}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#193F32] px-3.5 py-2 text-[13px] font-bold text-[#FAF7EF] hover:bg-[#193F32]/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] min-h-[44px]"
        >
          <span>Start</span>
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />
        </Link>
      </div>
    </article>
  );
}
