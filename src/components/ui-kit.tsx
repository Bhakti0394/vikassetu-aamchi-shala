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

export function Avatar({ child, size = "md" }: { child: Child; size?: "sm" | "md" | "lg" }) {
  const s =
    size === "lg"
      ? "h-20 w-20 text-5xl"
      : size === "sm"
        ? "h-10 w-10 text-2xl"
        : "h-14 w-14 text-3xl";
  return (
    <div
      className={cn(
        "wiggle flex shrink-0 items-center justify-center rounded-full ring-4 ring-card shadow-soft",
        toneBg[child.tone],
        s,
      )}
    >
      {child.avatar}
    </div>
  );
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
