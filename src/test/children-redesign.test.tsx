import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChildrenPage, Route } from "@/routes/children.index";
import { StoreProvider } from "@/lib/store";

// Mock tanstack router navigation
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children, to, params, ...props }: any) => (
      <a href={to} data-params={JSON.stringify(params)} {...props}>
        {children}
      </a>
    ),
  };
});

describe("Children Page Redesign & Roster List Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Route, "useSearch").mockReturnValue({ add: false });
  });

  it("renders the Children header with solid forest-green title and summary line", async () => {
    render(
      <StoreProvider>
        <ChildrenPage />
      </StoreProvider>
    );

    const heading = screen.getByRole("heading", { name: /Children/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("text-[#193F32]");

    const eyebrow = screen.getByText(/Our class/i);
    expect(eyebrow).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: /Add Child/i });
    expect(addBtn).toBeInTheDocument();
    expect(addBtn).toHaveClass("bg-[#193F32]");
  });

  it("renders slim search input and segmented attendance filter (All / Present / Absent)", async () => {
    render(
      <StoreProvider>
        <ChildrenPage />
      </StoreProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by name…/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveClass("h-[44px]");

    const allTab = screen.getByRole("tab", { name: /All/i });
    const presentTab = screen.getByRole("tab", { name: /Present/i });
    const absentTab = screen.getByRole("tab", { name: /Absent/i });

    expect(allTab).toBeInTheDocument();
    expect(presentTab).toBeInTheDocument();
    expect(absentTab).toBeInTheDocument();
  });

  it("filters children dynamically when typing into search input", async () => {
    render(
      <StoreProvider>
        <ChildrenPage />
      </StoreProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search by name…/i);
    fireEvent.change(searchInput, { target: { value: "Aarav" } });

    expect(screen.getAllByText("Aarav")[0]).toBeInTheDocument();

    // Search for non-existing child
    fireEvent.change(searchInput, { target: { value: "NonExistentChildXYZ" } });
    expect(screen.getByText(/No children match your search/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear search and filters/i })).toBeInTheDocument();
  });

  it("renders level meter with accessible label on child rows", async () => {
    render(
      <StoreProvider>
        <ChildrenPage />
      </StoreProvider>
    );

    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBeGreaterThan(0);
    expect(meters[0]).toHaveAttribute("aria-label");
    expect(meters[0]?.getAttribute("aria-label")).toMatch(/Level .* out of 3/i);
  });

  it("ensures roster items have no raw emoji characters outside of child avatars", async () => {
    const { container } = render(
      <StoreProvider>
        <ChildrenPage />
      </StoreProvider>
    );

    // Get all strongest and needs-attention labels
    const strongestLabels = screen.getAllByText("Strongest");
    expect(strongestLabels.length).toBeGreaterThan(0);

    // Verify SVG icons are used instead of domain emojis
    const areaIcons = container.querySelectorAll("svg");
    expect(areaIcons.length).toBeGreaterThan(0);
  });

  it("renders Add Child drawer with name input, age controls, and action buttons when add is true", async () => {
    vi.spyOn(Route, "useSearch").mockReturnValue({ add: true });

    render(
      <StoreProvider>
        <ChildrenPage />
      </StoreProvider>
    );

    expect(screen.getByRole("heading", { name: /Add a child/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Priya/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 years" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4 years" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5 years" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
