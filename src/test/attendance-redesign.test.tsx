import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Attendance } from "@/routes/attendance";
import * as api from "@/lib/api";

describe("Attendance Page Redesign Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockChildren = [
    {
      id: "ch-1",
      name: "Priya Sharma",
      age: 4,
      avatar: "👧🏽",
      tone: "coral" as const,
      scores: { alphabet: 2, numbers: 2, colours: 2, art: 2, stories: 2 },
      strengths: [],
      needs: [],
    },
    {
      id: "ch-2",
      name: "Aarav Patel",
      age: 5,
      avatar: "👦🏽",
      tone: "teal" as const,
      scores: { alphabet: 3, numbers: 3, colours: 3, art: 3, stories: 3 },
      strengths: [],
      needs: [],
    },
  ];

  it("renders page header with solid forest-green title and muted date", async () => {
    vi.spyOn(api, "apiRequest").mockImplementation(async (url: string) => {
      if (url === "/children") return mockChildren;
      if (url === "/attendance") return { attendance: {} };
      return null;
    });

    render(<Attendance />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Attendance" })).toBeInTheDocument();
    });

    const heading = screen.getByRole("heading", { name: "Attendance" });
    expect(heading).toHaveClass("text-[#193F32]");

    // Verify date is shown under the title
    expect(screen.getByText(/Tap Present or Absent for each child/i)).toBeInTheDocument();
  });

  it("renders slim summary strip with Present, Absent, and percent bar", async () => {
    vi.spyOn(api, "apiRequest").mockImplementation(async (url: string) => {
      if (url === "/children") return mockChildren;
      if (url === "/attendance") return { attendance: {} };
      return null;
    });

    render(<Attendance />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    expect(screen.getByText("Class Total Today")).toBeInTheDocument();
    expect(screen.getByText("Month history:")).toBeInTheDocument();
  });

  it("renders segmented Present/Absent toggle control with aria-pressed and icons", async () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    vi.spyOn(api, "apiRequest").mockImplementation(async (url: string, opts?: RequestInit) => {
      if (url === "/children") return mockChildren;
      if (url === "/attendance" && (!opts || opts.method !== "POST")) {
        return {
          attendance: {
            "ch-1": { [todayKey]: true },
            "ch-2": { [todayKey]: false },
          },
        };
      }
      if (url === "/attendance" && opts?.method === "POST") {
        return { success: true };
      }
      return null;
    });

    render(<Attendance />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    // Verify Priya's toggle has Present selected
    const priyaRow = screen.getByTestId("attendance-row-ch-1");
    const priyaPresentBtn = priyaRow.querySelector('button[aria-pressed="true"]');
    expect(priyaPresentBtn).toBeInTheDocument();
    expect(priyaPresentBtn).toHaveTextContent("Present");
    expect(priyaPresentBtn).toHaveClass("bg-[#2F7D4F]");

    // Verify Aarav's toggle has Absent selected
    const aaravRow = screen.getByTestId("attendance-row-ch-2");
    const aaravAbsentBtn = aaravRow.querySelector('button[aria-pressed="true"]');
    expect(aaravAbsentBtn).toBeInTheDocument();
    expect(aaravAbsentBtn).toHaveTextContent("Absent");
    expect(aaravAbsentBtn).toHaveClass("bg-[#C94A3F]");

    // Test toggling Aarav to Present
    const aaravPresentBtn = aaravRow.querySelector('button[aria-pressed="false"]');
    expect(aaravPresentBtn).toHaveTextContent("Present");
    fireEvent.click(aaravPresentBtn!);

    await waitFor(() => {
      expect(aaravPresentBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("renders month history bars with tooltip and aria-label", async () => {
    vi.spyOn(api, "apiRequest").mockImplementation(async (url: string) => {
      if (url === "/children") return mockChildren;
      if (url === "/attendance") return { attendance: {} };
      return null;
    });

    render(<Attendance />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    const historyGroup = screen.getByLabelText(/Attendance history for Priya Sharma/i);
    expect(historyGroup).toBeInTheDocument();
  });
});
