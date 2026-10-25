import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Attendance } from "@/routes/attendance";
import * as api from "@/lib/api";

const todayIst = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const kids = ["a", "b"].map((id) => ({
  id,
  name: `Child ${id}`,
  age: 4,
  avatar: "🧒🏽",
  tone: "teal" as const,
  scores: { alphabet: 2, numbers: 2, colours: 2, art: 2, stories: 2 },
  strengths: [],
  needs: [],
}));

function mockApi(attendance: Record<string, Record<string, boolean>>) {
  vi.spyOn(api, "apiRequest").mockImplementation(async (url: string) => {
    if (url === "/children") return kids;
    if (url === "/attendance") return { attendance };
    return null;
  });
}

describe("Attendance PDF download", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("downloads today's PDF when the button is clicked", async () => {
    mockApi({});
    const dl = vi.spyOn(api, "downloadAttendancePdf").mockResolvedValue();
    render(<Attendance />);
    const btn = await screen.findByTestId("download-attendance-pdf");
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    await waitFor(() => expect(dl).toHaveBeenCalledWith(todayIst()));
  });

  it("shows an error when generation fails", async () => {
    mockApi({});
    vi.spyOn(api, "downloadAttendancePdf").mockRejectedValue(new Error("boom"));
    render(<Attendance />);
    const btn = await screen.findByTestId("download-attendance-pdf");
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
  });

  it("announces the report is ready once everyone is marked", async () => {
    const d = todayIst();
    mockApi({ a: { [d]: true }, b: { [d]: false } });
    render(<Attendance />);
    expect(await screen.findByText(/attendance report is ready/i)).toBeInTheDocument();
  });
});
