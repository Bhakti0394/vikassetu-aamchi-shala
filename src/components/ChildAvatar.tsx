import React from "react";
import { SEED_CHILDREN, toneBg, type Child, type Tone } from "@/lib/data";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "card" | "selector";

export interface ChildAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  child?: Child | { id?: string; name?: string; avatar?: string; tone?: Tone } | string | null;
  size?: AvatarSize;
  className?: string;
  loading?: "lazy" | "eager";
}

const PIXEL_SIZES: Record<AvatarSize, number> = {
  xs: 24,
  selector: 32,
  sm: 32,
  card: 40,
  lg: 48,
  md: 56,
  xl: 80,
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 min-w-6 text-[13px]",
  selector: "h-8 w-8 min-w-8 text-[18px]",
  sm: "h-8 w-8 min-w-8 text-[18px]",
  card: "h-10 w-10 min-w-10 text-[22px]",
  lg: "h-12 w-12 min-w-12 text-[26px]",
  md: "h-14 w-14 min-w-14 text-3xl ring-4 ring-card shadow-soft wiggle",
  xl: "h-20 w-20 min-w-20 text-5xl ring-4 ring-card shadow-soft wiggle",
};

const BORDER_CLASSES: Record<AvatarSize, string> = {
  xs: "border border-[#E7DFD1]",
  selector: "border border-[#E7DFD1]",
  sm: "border border-[#E7DFD1]",
  card: "border border-[#E7DFD1]",
  lg: "border border-[#E7DFD1]",
  md: "",
  xl: "",
};

function isImageUrl(str?: string): boolean {
  if (!str) return false;
  return (
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("/") ||
    str.startsWith("./") ||
    /\.(png|jpe?g|webp|svg|gif)($|\?)/i.test(str)
  );
}

function resolveChildInfo(
  childOrId?: Child | { id?: string; name?: string; avatar?: string; tone?: Tone } | string | null,
): {
  id: string;
  name: string;
  avatar?: string | undefined;
  tone?: Tone | undefined;
} {
  if (!childOrId) {
    return { id: "", name: "" };
  }

  if (typeof childOrId === "string") {
    const seed = SEED_CHILDREN.find(
      (c) => c.id === childOrId || c.name.toLowerCase() === childOrId.toLowerCase(),
    );
    if (seed) {
      return { id: seed.id, name: seed.name, avatar: seed.avatar, tone: seed.tone };
    }
    return { id: childOrId, name: childOrId };
  }

  const id = childOrId.id || "";
  let name = childOrId.name || "";
  let avatar = childOrId.avatar;
  let tone = childOrId.tone;

  // If avatar or tone are missing, try finding the child in SEED_CHILDREN
  if ((!avatar || !tone) && (id || name)) {
    const seed = SEED_CHILDREN.find(
      (c) => (id && c.id === id) || (name && c.name.toLowerCase() === name.toLowerCase()),
    );
    if (seed) {
      name = name || seed.name;
      avatar = avatar || seed.avatar;
      tone = tone || seed.tone;
    }
  }

  return { id, name, avatar, tone };
}

/**
 * Shared ChildAvatar component.
 * Reuses the exact avatar and pastel tone defined for each child, matching the Children page.
 *
 * If a child has no avatar, gracefully falls back to the initial letter in a sage (#DCE9DD)
 * circle with forest-green (#193F32) text.
 */
export function ChildAvatar({
  child,
  size = "md",
  className,
  loading = "lazy",
  style,
  ...props
}: ChildAvatarProps) {
  const { name, avatar, tone } = resolveChildInfo(child);
  const px = PIXEL_SIZES[size] || 40;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.card;
  const borderClass = BORDER_CLASSES[size] || "border border-[#E7DFD1]";

  const hasAvatar = Boolean(avatar && avatar.trim().length > 0);

  // Fallback: If no avatar, render initial in a sage (#DCE9DD) circle with forest-green (#193F32) text
  if (!hasAvatar) {
    const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center shrink-0 select-none border border-[#E7DFD1] font-display font-bold leading-none",
          sizeClass,
          className,
        )}
        style={{
          backgroundColor: "#DCE9DD",
          color: "#193F32",
          ...style,
        }}
        aria-hidden="true"
        {...props}
      >
        <span>{initial}</span>
      </div>
    );
  }

  const isImg = isImageUrl(avatar);
  const toneBgClass = tone && toneBg[tone] ? toneBg[tone] : "bg-teal-soft";

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center shrink-0 select-none overflow-hidden",
        toneBgClass,
        borderClass,
        sizeClass,
        className,
      )}
      style={style}
      aria-hidden="true"
      {...props}
    >
      {isImg ? (
        <img
          src={avatar}
          alt=""
          width={px}
          height={px}
          loading={loading}
          className="h-full w-full object-cover rounded-full"
        />
      ) : (
        <span
          className="select-none leading-none flex items-center justify-center pointer-events-none"
          role="img"
          aria-hidden="true"
        >
          {avatar}
        </span>
      )}
    </div>
  );
}
