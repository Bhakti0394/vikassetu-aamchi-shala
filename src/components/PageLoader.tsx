import { useEffect, useState } from "react";
import { LeafMark } from "./illustrations";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const DEFAULT_MESSAGES = [
  "Preparing classroom activities…",
  "Organising children's observations…",
  "Gathering today's recommendations…",
  "Setting up early learning steps…",
];

export function PageLoader({
  message,
  fullScreen = true,
  className,
}: PageLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [message]);

  const activeMessage = message || DEFAULT_MESSAGES[msgIndex];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center select-none",
        fullScreen
          ? "fixed inset-0 z-50 min-h-screen w-screen bg-[#FAF7EF]/95 backdrop-blur-md transition-all duration-300"
          : "min-h-[340px] w-full py-12",
        className,
      )}
    >
      <style>{`
        @keyframes shimmerSlow {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-4px) scale(1.03); }
        }
      `}</style>

      {/* Decorative ambient glow */}
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute -inset-4 rounded-full bg-gradient-to-tr from-[#193F32]/10 via-[#DF806B]/15 to-[#F3C969]/15 blur-xl animate-pulse"
        />

        {/* Outer orbital spinning ring */}
        <div
          aria-hidden="true"
          className="relative h-20 w-20 rounded-full border-[3px] border-[#E7DFD1] border-t-[#193F32] border-r-[#DF806B] animate-spin [animation-duration:1.3s]"
        />

        {/* Center floating VikasSetu LeafMark */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-10 w-10 drop-shadow-sm animate-[subtleFloat_2.4s_ease-in-out_infinite]">
            <LeafMark className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Brand title */}
      <div className="mt-5 space-y-1">
        <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#193F32]">
          VikasSetu
        </h2>
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#193F32]/70">
          Aamchi Shala
        </p>
      </div>

      {/* Shimmer loading progress bar */}
      <div
        aria-hidden="true"
        className="mt-4 h-1.5 w-36 overflow-hidden rounded-full bg-[#E7DFD1]/70"
      >
        <div
          className="h-full w-full rounded-full bg-gradient-to-r from-[#193F32] via-[#DF806B] to-[#193F32]"
          style={{
            backgroundSize: "200% 100%",
            animation: "shimmerSlow 1.8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Dynamic uplifting status text */}
      <p className="mt-3 text-xs sm:text-sm font-medium text-[#57655B] transition-opacity duration-300">
        {activeMessage}
      </p>
    </div>
  );
}

/**
 * Sleek top-of-screen progress bar that activates during route transitions
 */
export function TopRouteProgressBar({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading route"
      className="fixed top-0 left-0 right-0 z-[9999] h-1 overflow-hidden bg-transparent pointer-events-none"
    >
      <div
        className="h-full w-full bg-gradient-to-r from-[#193F32] via-[#DF806B] to-[#F3C969]"
        style={{
          backgroundSize: "200% 100%",
          animation: "shimmerSlow 1.2s linear infinite",
        }}
      />
    </div>
  );
}
