import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { CalendarCheck, Home, Lightbulb, PenLine, Shapes, Users } from "lucide-react";
import { LeafMark } from "@/components/illustrations";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import { initOfflineQueue, registerAutoSyncOnOnline } from "../lib/activityLogs";
import { cn } from "@/lib/utils";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
        <Link to="/dashboard" className="btn btn-primary mt-6">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-muted-foreground">
          Something went wrong. Try again or return to the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn btn-primary"
          >
            Try again
          </button>
          <Link to="/dashboard" className="btn btn-ghost">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "VikasSetu — Every child learns differently" },
      {
        name: "description",
        content:
          "A thoughtful classroom companion for tracking children’s learning and planning playful activities.",
      },
      { property: "og:title", content: "VikasSetu — Every child learns differently" },
      {
        property: "og:description",
        content:
          "A thoughtful classroom companion for tracking children’s learning and planning playful activities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: Home },
  { to: "/children", label: "Children", mobileLabel: "Kids", icon: Users },
  { to: "/activities", label: "Activities", mobileLabel: "Play", icon: Shapes },
  { to: "/progress", label: "Progress", mobileLabel: "Record", icon: PenLine },
  { to: "/recommendations", label: "Recommendations", mobileLabel: "Ideas", icon: Lightbulb },
  { to: "/attendance", label: "Attendance", mobileLabel: "Roll", icon: CalendarCheck },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCurrent = (to: (typeof NAV)[number]["to"]) =>
    pathname === to || pathname.startsWith(to + "/");

  const isLandingPage = pathname === "/";

  useEffect(() => {
    // Initialize persistent IndexedDB offline queue on application startup
    initOfflineQueue().catch((err) => {
      console.error("VikasSetu: Failed to initialize offline queue:", err);
    });

    // Register automatic background sync when browser network reconnects
    const unsubscribe = registerAutoSyncOnOnline();

    return () => {
      unsubscribe();
    };
  }, []);

  if (isLandingPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <StoreProvider>
          <Outlet />
        </StoreProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] lg:flex">
          <aside className="border-b border-[var(--border)] bg-[var(--bg-section)] lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
            <Link
              to="/"
              title="Return to Landing Page"
              aria-label="VikasSetu – Aamchi Shala home"
              className="flex min-h-16 items-center gap-2.5 px-4 py-3 sm:px-5 lg:py-7 hover:opacity-90 transition-opacity"
            >
              <span className="grid place-items-center w-[34px] h-[34px] shrink-0" aria-hidden="true">
                <LeafMark className="w-[34px] h-[34px]" />
              </span>
              <div className="grid gap-[1px] leading-none">
                <strong className="font-serif text-[20px] tracking-[-0.03em] font-bold text-[#193F32]">
                  VikasSetu
                </strong>
                <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#193F32]/75">
                  Aamchi Shala
                </span>
              </div>
            </Link>
            <nav
              aria-label="Main navigation"
              className="hidden gap-1 px-3 pb-3 md:flex md:flex-wrap lg:flex-col lg:flex-nowrap lg:pb-0"
            >
              {NAV.map(({ to, label, icon: Icon }) => {
                const active = isCurrent(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    activeOptions={{ exact: false }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[42px] shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] lg:text-base",
                      active
                        ? "bg-[var(--brand)] text-[#FAF7EF] shadow-xs"
                        : "text-[var(--text-muted)] hover:bg-[var(--accent-soft)]/50 hover:text-[var(--text)]",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active ? "text-[#FAF7EF]" : "text-[var(--text-muted)]",
                      )}
                    />
                    <span className={active ? "text-[#FAF7EF]" : undefined}>{label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mx-4 mt-8 hidden rounded-[12px] border border-[#EADBCA] bg-[#FAF3E6] p-4 text-sm lg:block">
              <p className="font-display text-base font-bold text-[var(--text)]">
                Every child learns differently.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Observe, understand, and choose the right activity.
              </p>
            </div>
          </aside>
          <nav
            aria-label="Quick navigation"
            className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-[var(--border)] bg-[var(--bg-section)] px-1 pt-2 pb-[env(safe-area-inset-bottom)] md:hidden"
          >
            {NAV.map(({ to, label, mobileLabel, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-label={label}
                aria-current={isCurrent(to) ? "page" : undefined}
                className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] px-0.5 text-[0.68rem] font-bold leading-none transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${isCurrent(to) ? "text-[var(--brand)]" : "text-[var(--text-muted)]"}`}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate">{mobileLabel}</span>
              </Link>
            ))}
          </nav>
          <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pt-5 pb-24 sm:px-8 sm:pt-8 lg:py-10">
            <Outlet />
          </main>
        </div>
      </StoreProvider>
    </QueryClientProvider>
  );
}
