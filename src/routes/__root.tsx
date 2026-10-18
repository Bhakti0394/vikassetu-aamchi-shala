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

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import { initOfflineQueue, registerAutoSyncOnOnline } from "../lib/activityLogs";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="btn btn-primary mt-6">
          Go home
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
          Something went wrong. Try again or return to the home page.
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
          <Link to="/" className="btn btn-ghost">
            Go home
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
  { to: "/", label: "Dashboard", mobileLabel: "Home", icon: Home },
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
    to === "/" ? pathname === "/" : pathname.startsWith(to);

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
      <StoreProvider>
        <div className="mesh-bg min-h-screen lg:flex">
          <aside className="glass border-b lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
            <div className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5 lg:py-7">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl hero-gradient text-2xl shadow-lift">
                🌱
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-bold leading-none">VikasSetu</p>
                <p className="text-xs text-muted-foreground">Aamchi Shala</p>
              </div>
            </div>
            <nav
              aria-label="Main navigation"
              className="hidden gap-1.5 px-3 pb-3 md:flex md:flex-wrap lg:flex-col lg:flex-nowrap lg:pb-0"
            >
              {NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: to === "/" }}
                  className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary lg:px-4 lg:py-3 lg:text-base"
                  activeProps={{ className: "bg-primary-soft text-primary" }}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" /> {label}
                </Link>
              ))}
            </nav>
            <div className="mx-4 mt-8 hidden rounded-2xl bg-sun-soft p-4 text-sm lg:block">
              <p className="font-display text-base font-bold">Every child learns differently.</p>
              <p className="mt-1 text-muted-foreground">
                Observe, understand, and choose the right activity.
              </p>
            </div>
          </aside>
          <nav
            aria-label="Quick navigation"
            className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t glass px-1 pt-2 pb-[env(safe-area-inset-bottom)] md:hidden"
          >
            {NAV.map(({ to, label, mobileLabel, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-label={label}
                aria-current={isCurrent(to) ? "page" : undefined}
                className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-0.5 text-[0.68rem] font-bold leading-none transition focus-visible:ring-2 focus-visible:ring-primary ${isCurrent(to) ? "text-primary" : "text-muted-foreground"}`}
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
