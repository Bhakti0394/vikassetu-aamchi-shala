import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import * as api from "@/lib/api";
import { StoreProvider } from "@/lib/store";
import { Route } from "@/routes/dashboard";

// Mock tanstack router Link
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

describe("Dashboard Redesign Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockChildren = [
    {
      id: "aarav",
      name: "Aarav",
      age: 4,
      avatar: "👦🏽",
      tone: "teal" as const,
      scores: { alphabet: 1, numbers: 2, colours: 1, art: 2, stories: 3 },
      strengths: ["Great at stories"],
      needs: ["Needs practice in alphabet"],
    },
    {
      id: "vihaan",
      name: "Vihaan",
      age: 3,
      avatar: "👦🏽",
      tone: "coral" as const,
      scores: { alphabet: 2, numbers: 1, colours: 3, art: 3, stories: 3 },
      strengths: ["Strong counting"],
      needs: ["Counting seeds"],
    },
  ];

  it("renders the hero banner with frosted greeting, headline and proper buttons", async () => {
    vi.spyOn(api, "apiRequest").mockImplementation(async (url: string) => {
      if (url === "/dashboard/summary") {
        return {
          totalChildren: 2,
          presentToday: 1,
          needsAttentionCount: 1,
          activitiesDone: 4,
          attentionList: [mockChildren[0]],
          domainDistribution: {
            alphabet: { 1: 1, 2: 1, 3: 0 },
            numbers: { 1: 0, 2: 1, 3: 1 },
            colours: { 1: 1, 2: 0, 3: 1 },
            art: { 1: 0, 2: 1, 3: 1 },
            stories: { 1: 0, 2: 0, 3: 2 },
          },
        };
      }
      return null;
    });

    const DashboardComponent = Route.options.component!;
    render(
      <StoreProvider>
        <DashboardComponent />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Welcome banner" })).toBeInTheDocument();
    });

    // Verify time-aware greeting without wave emoji
    expect(screen.getByText(/Teacher/)).toBeInTheDocument();
    expect(screen.queryByText(/👋/)).not.toBeInTheDocument();

    // Verify headline with coral accent
    expect(screen.getByRole("heading", { name: /What should I do/i })).toBeInTheDocument();
    expect(screen.getByText("today?")).toHaveClass("text-[#DF806B]");

    // Verify action buttons
    const recordButtons = screen.getAllByRole("link", { name: /Record Observation/i });
    expect(recordButtons[0]).toBeInTheDocument();
    expect(recordButtons[0]).toHaveClass("bg-[#FAF7EF]");
    expect(recordButtons[0]).toHaveClass("text-[#193F32]");

    const addButtons = screen.getAllByRole("link", { name: /Add Child/i });
    expect(addButtons[0]).toBeInTheDocument();
    expect(addButtons[0]).toHaveClass("text-[#FAF7EF]");
  });

  it("renders 4 compact stat tiles with proper links and scope labels", async () => {
    vi.spyOn(api, "apiRequest").mockImplementation(async () => {
      return {
        totalChildren: 8,
        presentToday: 6,
        needsAttentionCount: 2,
        activitiesDone: 12,
        attentionList: [mockChildren[0]],
        domainDistribution: {},
      };
    });

    const DashboardComponent = Route.options.component!;
    render(
      <StoreProvider>
        <DashboardComponent />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Total enrolled")).toBeInTheDocument();
    });

    expect(screen.getByText("Present today")).toBeInTheDocument();
    expect(screen.getByText("Need attention")).toBeInTheDocument();
    expect(screen.getByText("Activities logged")).toBeInTheDocument();

    // Verify tile links
    expect(screen.getByRole("link", { name: /Total enrolled/i })).toHaveAttribute("href", "/children");
    expect(screen.getByRole("link", { name: /Present today/i })).toHaveAttribute("href", "/attendance");
    expect(screen.getByRole("link", { name: /Need attention/i })).toHaveAttribute("href", "/recommendations");
    expect(screen.getByRole("link", { name: /Activities logged/i })).toHaveAttribute("href", "/progress");
  });

  it("renders Today's Focus cards with 3-segment meters and cream suggested activity panel", async () => {
    vi.spyOn(api, "apiRequest").mockImplementation(async () => {
      return {
        totalChildren: 2,
        presentToday: 1,
        needsAttentionCount: 1,
        activitiesDone: 4,
        attentionList: [mockChildren[0]],
        domainDistribution: {},
      };
    });

    const DashboardComponent = Route.options.component!;
    render(
      <StoreProvider>
        <DashboardComponent />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Aarav")).toBeInTheDocument();
    });

    // Verify 3-segment level meter exists
    const meter = screen.getByRole("meter");
    expect(meter).toBeInTheDocument();

    // Verify suggested activity panel
    expect(screen.getByText("Suggested activity")).toBeInTheDocument();
    expect(screen.getByText("Suggested activity").closest("div")).toHaveClass("bg-[#F4EFE3]");

    // Verify "Start" button and "View Plan" link
    expect(screen.getByRole("link", { name: /Start/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Plan/i })).toBeInTheDocument();
  });

  it("renders class learning overview with legend at the top", async () => {
    vi.spyOn(api, "apiRequest").mockImplementation(async () => {
      return {
        totalChildren: 2,
        presentToday: 1,
        needsAttentionCount: 1,
        activitiesDone: 4,
        attentionList: [mockChildren[0]],
        domainDistribution: {},
      };
    });

    const DashboardComponent = Route.options.component!;
    render(
      <StoreProvider>
        <DashboardComponent />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Class learning overview")).toBeInTheDocument();
    });

    // Legend items with Sprout, Leaf, TreeDeciduous text
    expect(screen.getByText("Needs support")).toBeInTheDocument();
    expect(screen.getByText("Developing")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("renders the right rail with Today in class and Quick actions", async () => {
    vi.spyOn(api, "apiRequest").mockImplementation(async () => {
      return {
        totalChildren: 9,
        presentToday: 6,
        needsAttentionCount: 3,
        activitiesDone: 15,
        attentionList: [mockChildren[0]],
        domainDistribution: {},
      };
    });

    const DashboardComponent = Route.options.component!;
    render(
      <StoreProvider>
        <DashboardComponent />
      </StoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Today in class")).toBeInTheDocument();
    });

    expect(screen.getByText("Quick actions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Take attendance/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Record observation/i })[1]).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse activities/i })).toBeInTheDocument();
  });
});
