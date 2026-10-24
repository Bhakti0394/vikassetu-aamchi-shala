import type { ComponentType, SVGProps } from "react";
import {
  BookA,
  Hash,
  Palette,
  Brush,
  BookOpen,
  LayoutGrid,
  Clock,
  Signal,
  ArrowRight,
  Play,
  Sprout,
  Leaf,
  TreeDeciduous,
  Check,
  Sparkles,
  Smile,
  Scissors,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DomainId, Score } from "@/lib/data";

export type LucideIconType = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: number | string;
    strokeWidth?: number | string;
    className?: string;
  }
>;

/**
 * Domain Lucide icon mapping:
 * - Alphabet & Language: BookA
 * - Numbers & Counting: Hash
 * - Colours & Shapes: Palette
 * - Art & Creativity: Brush
 * - Stories, Habits & Games: BookOpen
 * - All: LayoutGrid
 */
export const DOMAIN_ICONS: Record<DomainId | "all", LucideIconType> = {
  alphabet: BookA,
  numbers: Hash,
  colours: Palette,
  art: Brush,
  stories: BookOpen,
  all: LayoutGrid,
};

/**
 * Activity-specific icon mapping fallback to domain icon
 */
export const ACTIVITY_ICONS: Record<string, LucideIconType> = {
  "alphabet-match": BookA,
  "letter-sound-bingo": BookA,
  "letter-tracing-sand": BookA,
  "name-letter-hunt": BookA,
  "rhyming-pairs": BookA,
  "counting-seeds": Hash,
  "number-hopscotch": Hash,
  "finger-counting-songs": Hash,
  "more-or-less-baskets": Hash,
  "colour-sorting": Palette,
  "shape-scavenger-hunt": Palette,
  "colour-mixing-water": Palette,
  "pattern-blocks": Layers,
  "shape-collages": Palette,
  "leaf-rubbing": Brush,
  "clay-modelling": Brush,
  "torn-paper-mosaic": Scissors,
  "picture-story-walk": BookOpen,
  "daily-routine-cards": Clock,
  "pass-the-ball-sharing": Smile,
  "animal-charades": Sparkles,
};

/**
 * Observation Rating Icons (replacing 🌱, 🌿, 🌳):
 * 1 (Needs Support): Sprout
 * 2 (Developing): Leaf
 * 3 (Good): TreeDeciduous
 */
export const RATING_ICONS: Record<Score, LucideIconType> = {
  1: Sprout,
  2: Leaf,
  3: TreeDeciduous,
};

export {
  BookA,
  Hash,
  Palette,
  Brush,
  BookOpen,
  LayoutGrid,
  Clock,
  Signal,
  ArrowRight,
  Play,
  Sprout,
  Leaf,
  TreeDeciduous,
  Check,
};

interface AreaIconProps {
  domain: DomainId | "all" | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  tile?: boolean;
  tint?: "sage" | "cream";
  tileClassName?: string;
}

export function AreaIcon({
  domain,
  size = 20,
  strokeWidth = 1.75,
  className,
  tile = false,
  tint = "sage",
  tileClassName,
}: AreaIconProps) {
  const IconComponent =
    (domain in DOMAIN_ICONS
      ? DOMAIN_ICONS[domain as DomainId | "all"]
      : DOMAIN_ICONS.all) || DOMAIN_ICONS.all;

  if (tile) {
    const bgClass = tint === "sage" ? "bg-[#DCE9DD]" : "bg-[#F4EFE3]";
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[10px] text-[#193F32]",
          bgClass,
          tileClassName || "h-10 w-10 sm:h-11 sm:w-11"
        )}
      >
        <IconComponent
          size={size}
          strokeWidth={strokeWidth}
          className={cn("text-[#193F32]", className)}
        />
      </span>
    );
  }

  return (
    <IconComponent
      aria-hidden="true"
      size={size}
      strokeWidth={strokeWidth}
      className={cn("text-[#193F32] shrink-0", className)}
    />
  );
}

interface ActivityIconProps {
  activity?: { id?: string; domain?: DomainId } | string;
  domain?: DomainId | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  tile?: boolean;
  tint?: "sage" | "cream";
  tileClassName?: string;
}

export function ActivityIcon({
  activity,
  domain,
  size = 20,
  strokeWidth = 1.75,
  className,
  tile = false,
  tint = "sage",
  tileClassName,
}: ActivityIconProps) {
  const actId = typeof activity === "string" ? activity : activity?.id;
  const domId =
    (typeof activity === "object" ? activity?.domain : undefined) ||
    (domain as DomainId);

  let IconComponent: LucideIconType | undefined;
  if (actId && ACTIVITY_ICONS[actId]) {
    IconComponent = ACTIVITY_ICONS[actId];
  } else if (domId && DOMAIN_ICONS[domId as DomainId | "all"]) {
    IconComponent = DOMAIN_ICONS[domId as DomainId | "all"];
  } else {
    IconComponent = BookOpen;
  }

  if (tile) {
    const bgClass = tint === "sage" ? "bg-[#DCE9DD]" : "bg-[#F4EFE3]";
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[10px] text-[#193F32]",
          bgClass,
          tileClassName || "h-10 w-10 sm:h-11 sm:w-11"
        )}
      >
        <IconComponent
          size={size}
          strokeWidth={strokeWidth}
          className={cn("text-[#193F32]", className)}
        />
      </span>
    );
  }

  return (
    <IconComponent
      aria-hidden="true"
      size={size}
      strokeWidth={strokeWidth}
      className={cn("text-[#193F32] shrink-0", className)}
    />
  );
}

export function RatingIcon({
  score,
  size = 28,
  strokeWidth = 1.75,
  className,
}: {
  score: Score;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const IconComponent = RATING_ICONS[score] || Sprout;
  return (
    <IconComponent
      aria-hidden="true"
      size={size}
      strokeWidth={strokeWidth}
      className={cn("text-[#193F32] shrink-0", className)}
    />
  );
}
