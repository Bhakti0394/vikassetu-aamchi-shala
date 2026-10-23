import { Link } from "@tanstack/react-router";
import {
  DOMAINS,
  SCORE_LABEL,
  domainOf,
  toneBg,
  toneFill,
  type Child,
  type DomainId,
  type Score,
  type Tone,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, CloudOff, RefreshCw } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-sm font-bold uppercase tracking-wider text-primary">{eyebrow}</p>
        )}
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          <span className="text-gradient">{title}</span>
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

import { ChildAvatar } from "./ChildAvatar";

export function Avatar({ child, size = "md" }: { child: Child; size?: "sm" | "md" | "lg" }) {
  const mappedSize = size === "lg" ? "xl" : size === "sm" ? "sm" : "md";
  return <ChildAvatar child={child} size={mappedSize} />;
}

export function LevelDots({ score, tone = "primary" }: { score: Score; tone?: Tone }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("h-2.5 w-7 rounded-full", i <= score ? toneFill[tone] : "bg-muted")}
        />
      ))}
    </div>
  );
}

export function ScoreBadge({ score }: { score: Score }) {
  const cls =
    score === 1
      ? "bg-coral-soft text-coral"
      : score === 2
        ? "bg-sun-soft text-foreground"
        : "bg-primary-soft text-primary";
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", cls)}>
      {score}/3 · {SCORE_LABEL[score]}
    </span>
  );
}

export function DomainChip({ id }: { id: DomainId }) {
  const d = domainOf(id);
  if (!d) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
        toneBg[d.tone],
      )}
    >
      {d.emoji} {d.name}
    </span>
  );
}

export function DomainBars({ child }: { child: Child }) {
  return (
    <div className="space-y-4 stagger">
      {DOMAINS.map((d) => (
        <div key={d.id} className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-xl",
              toneBg[d.tone],
            )}
          >
            {d.emoji}
          </div>
          <div className="flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="font-bold">{d.name}</span>
              <ScoreBadge score={child.scores[d.id]} />
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "grow-x h-full rounded-full transition-all duration-700",
                  toneFill[d.tone],
                )}
                style={{ width: `${(child.scores[d.id] / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StartButton({
  activityId,
  childId,
  label = "Start Activity",
}: {
  activityId: string;
  childId?: string;
  label?: string;
}) {
  return (
    <Link
      to="/activities/$id"
      params={{ id: activityId }}
      search={childId ? { child: childId } : {}}
      className="btn btn-primary"
    >
      ▶ {label}
    </Link>
  );
}

export type SyncStatusBadgeProps = {
  pendingCount: number;
  failedCount: number;
  isSyncing?: boolean | undefined;
  onSync?: (() => void | Promise<void>) | undefined;
  onDismissFailed?: (() => void | Promise<void>) | undefined;
  isPersistent?: boolean | undefined;
  storageWarning?: string | undefined;
  className?: string | undefined;
};

/**
 * Minimal, accessible sync status indicator for activity trials.
 * Features aria-live="polite" announcements, WCAG AA contrast, and
 * inline recovery actions.
 */
export function SyncStatusBadge({
  pendingCount,
  failedCount,
  isSyncing = false,
  onSync,
  onDismissFailed,
  isPersistent = true,
  storageWarning,
  className,
}: SyncStatusBadgeProps) {
  const totalUnsynced = pendingCount + failedCount;

  return (
    <div
      className={cn("inline-flex flex-wrap items-center gap-2 text-xs", className)}
      role="region"
      aria-label="Activity trial synchronization status"
    >
      <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5">
        {isSyncing ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft text-teal px-2.5 py-1 font-bold border border-teal/30">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal" aria-hidden="true" />
            <span>
              Syncing {totalUnsynced} trial{totalUnsynced === 1 ? "" : "s"}...
            </span>
          </span>
        ) : failedCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft text-coral px-2.5 py-1 font-bold border border-coral/30">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {failedCount} failed to sync{pendingCount > 0 ? ` (${pendingCount} queued)` : ""}
            </span>
          </span>
        ) : pendingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft text-foreground px-2.5 py-1 font-bold border border-sun/50">
            <RefreshCw className="h-3.5 w-3.5 shrink-0 text-sun-foreground" aria-hidden="true" />
            <span>
              {pendingCount} offline trial{pendingCount === 1 ? "" : "s"} waiting
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft text-primary px-2.5 py-1 font-bold border border-primary/30">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>All trials synced</span>
          </span>
        )}
      </span>

      {!isPersistent && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-sun-soft/60 text-foreground px-2 py-0.5 text-[0.7rem] font-semibold border border-sun/40"
          title={storageWarning || "IndexedDB unavailable; stored in temporary memory only"}
        >
          <CloudOff className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          <span>Session only</span>
        </span>
      )}

      {onSync && totalUnsynced > 0 && !isSyncing && (
        <button
          type="button"
          onClick={onSync}
          className="btn btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={failedCount > 0 ? "Retry syncing failed trials" : "Sync offline trials now"}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{failedCount > 0 ? "Retry sync" : "Sync now"}</span>
        </button>
      )}

      {onDismissFailed && failedCount > 0 && !isSyncing && (
        <button
          type="button"
          onClick={onDismissFailed}
          className="btn btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Dismiss failed trials"
        >
          <span>Clear failed</span>
        </button>
      )}
    </div>
  );
}
