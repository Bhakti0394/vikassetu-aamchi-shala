import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SyncStatusBadge } from "./ui-kit";

describe("SyncStatusBadge Component (src/components/ui-kit.tsx)", () => {
  it("renders 'All trials synced' when there are zero pending and zero failed trials", () => {
    render(<SyncStatusBadge pendingCount={0} failedCount={0} />);

    expect(screen.getByText("All trials synced")).toBeInTheDocument();
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  it("renders syncing state with spinner and count when isSyncing is true", () => {
    render(
      <SyncStatusBadge
        pendingCount={2}
        failedCount={1}
        isSyncing={true}
      />,
    );

    expect(screen.getByText("Syncing 3 trials...")).toBeInTheDocument();
  });

  it("renders pending offline trials state with 'Sync now' action", () => {
    const handleSync = vi.fn();
    render(
      <SyncStatusBadge
        pendingCount={3}
        failedCount={0}
        onSync={handleSync}
      />,
    );

    expect(screen.getByText("3 offline trials waiting")).toBeInTheDocument();
    const syncBtn = screen.getByRole("button", { name: /Sync offline trials now/i });
    expect(syncBtn).toBeInTheDocument();

    fireEvent.click(syncBtn);
    expect(handleSync).toHaveBeenCalledTimes(1);
  });

  it("renders failed sync state with 'Retry sync' and 'Clear failed' actions", () => {
    const handleSync = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <SyncStatusBadge
        pendingCount={1}
        failedCount={2}
        onSync={handleSync}
        onDismissFailed={handleDismiss}
      />,
    );

    expect(screen.getByText("2 failed to sync (1 queued)")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Retry syncing failed trials/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(handleSync).toHaveBeenCalledTimes(1);

    const clearBtn = screen.getByRole("button", { name: /Dismiss failed trials/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it("displays 'Session only' pill when isPersistent is false", () => {
    render(
      <SyncStatusBadge
        pendingCount={0}
        failedCount={0}
        isPersistent={false}
        storageWarning="IndexedDB unavailable"
      />,
    );

    expect(screen.getByText("Session only")).toBeInTheDocument();
  });

  it("enforces minimum 44px touch target height and focus-visible indicators on recovery action buttons", () => {
    render(
      <SyncStatusBadge
        pendingCount={1}
        failedCount={1}
        onSync={vi.fn()}
        onDismissFailed={vi.fn()}
      />,
    );

    const retryBtn = screen.getByRole("button", { name: /Retry syncing failed trials/i });
    expect(retryBtn.className).toContain("min-h-[44px]");
    expect(retryBtn.className).toContain("focus-visible:ring-2");

    const clearBtn = screen.getByRole("button", { name: /Dismiss failed trials/i });
    expect(clearBtn.className).toContain("min-h-[44px]");
    expect(clearBtn.className).toContain("focus-visible:ring-2");
  });
});
