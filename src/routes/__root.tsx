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
import { PageLoader, TopRouteProgressBar } from "@/components/PageLoader";
import { I18nProvider, useI18n, type TranslationKey } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";

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
  pendingComponent: () => <PageLoader />,
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

const NAV_ITEMS = [
  { to: "/dashboard", key: "nav.dashboard", fallback: "Dashboard", mobileLabel: "Home", icon: Home },
  { to: "/children", key: "nav.children", fallback: "Children", mobileLabel: "Kids", icon: Users },
  { to: "/activities", key: "nav.activities", fallback: "Activities", mobileLabel: "Play", icon: Shapes },
  { to: "/progress", key: "nav.progress", fallback: "Progress", mobileLabel: "Record", icon: PenLine },
  { to: "/recommendations", key: "nav.recommendations", fallback: "Recommendations", mobileLabel: "Ideas", icon: Lightbulb },
  { to: "/attendance", key: "nav.attendance", fallback: "Attendance", mobileLabel: "Roll", icon: CalendarCheck },
] as const;

function AppLayout({ isNavigating }: { isNavigating: boolean }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCurrent = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)] lg:flex">
      <TopRouteProgressBar isLoading={isNavigating} />
      <aside className="border-b border-[var(--border)] bg-[var(--bg-section)] lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between px-4 py-3 sm:px-5 lg:py-6">
            <Link
              to="/"
              title="Return to Landing Page"
              aria-label="VikasSetu – Aamchi Shala home"
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              <span className="grid place-items-center w-[34px] h-[34px] shrink-0" aria-hidden="true">
                <LeafMark className="w-[34px] h-[34px]" />
              </span>
              <div className="grid gap-[1px] leading-none">
                <strong className="font-serif text-[20px] tracking-[-0.03em] font-bold text-[#193F32]">
                  {t("brand.title", "VikasSetu")}
                </strong>
                <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#193F32]/75">
                  {t("brand.subtitle", "Aamchi Shala")}
                </span>
              </div>
            </Link>

            {/* Language Selector in Sidebar */}
            <LanguageSelector variant="pill" className="shrink-0" />
          </div>

          <nav
            aria-label="Main navigation"
            className="hidden gap-1 px-3 pb-3 md:flex md:flex-wrap lg:flex-col lg:flex-nowrap lg:pb-0"
          >
            {NAV_ITEMS.map(({ to, key, fallback, icon: Icon }) => {
              const active = isCurrent(to);
              const label = t(key as TranslationKey, fallback);
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
        </div>

        <div className="mx-4 mb-6 hidden rounded-[12px] border border-[#EADBCA] bg-[#FAF3E6] p-4 text-sm lg:block">
          <p className="font-display text-base font-bold text-[var(--text)]">
            {t("brand.tagline", "Every child learns differently.")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            {t("brand.subtagline", "Observe, understand, and choose the right activity.")}
          </p>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-[var(--border)] bg-[var(--bg-section)] px-1 pt-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV_ITEMS.map(({ to, key, fallback, mobileLabel, icon: Icon }) => {
          const label = t(key as TranslationKey, fallback);
          return (
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
          );
        })}
      </nav>

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pt-5 pb-24 sm:px-8 sm:pt-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isNavigating = useRouterState({ select: (s) => s.isLoading });
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

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <StoreProvider>
          {isLandingPage ? (
            <>
              <TopRouteProgressBar isLoading={isNavigating} />
              <Outlet />
            </>
          ) : (
            <AppLayout isNavigating={isNavigating} />
          )}
        </StoreProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
