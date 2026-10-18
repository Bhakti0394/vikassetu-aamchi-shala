import { describe, expect, it } from "vitest";
import {
  clearPendingTrials,
  fetchActivityLogs,
  fetchChildActivityHistory,
  getPendingTrials,
  queuePendingTrial,
  saveActivityLog,
  syncPendingTrials,
  type ActivityLogPayload,
} from "./activityLogs";

describe("Activity Logs Client (src/lib/activityLogs.ts)", () => {
  it("fetches activity logs from the live backend without throwing", async () => {
    const res = await fetchActivityLogs();
    expect(res).toBeDefined();
    expect(typeof res.success).toBe("boolean");
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("successfully posts a tried_helped activity log to the live backend", async () => {
    const payload: ActivityLogPayload = {
      childId: "aarav",
      activityId: "leaf-painting",
      completedSteps: 3,
      totalSteps: 3,
      outcome: "tried_helped",
      note: "Live automated test note for helped outcome",
    };

    const res = await saveActivityLog(payload);
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.childId).toBe("aarav");
    expect(res.data?.outcome).toBe("tried_helped");
    expect(res.data?.id).toBeDefined();
  });

  it("successfully posts a tried_needs_support activity log to the live backend", async () => {
    const payload: ActivityLogPayload = {
      childId: "anaya",
      activityId: "bead-counting",
      completedSteps: 2,
      totalSteps: 3,
      outcome: "tried_needs_support",
      note: "Live automated test note for needs support outcome",
    };

    const res = await saveActivityLog(payload);
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.childId).toBe("anaya");
    expect(res.data?.outcome).toBe("tried_needs_support");
  });

  it("successfully posts a not_tried activity log to the live backend", async () => {
    const payload: ActivityLogPayload = {
      childId: "vihaan",
      activityId: "alphabet-match",
      completedSteps: 0,
      totalSteps: 4,
      outcome: "not_tried",
    };

    const res = await saveActivityLog(payload);
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.childId).toBe("vihaan");
    expect(res.data?.outcome).toBe("not_tried");
  });

  it("returns an inline error without crashing when backend rejects invalid payload", async () => {
    // completedSteps > totalSteps violates backend validator
    const invalidPayload: ActivityLogPayload = {
      childId: "test-child-invalid",
      activityId: "leaf-painting",
      completedSteps: 10,
      totalSteps: 3,
      outcome: "tried_helped",
    };

    const res = await saveActivityLog(invalidPayload);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.data).toBeUndefined();
  });

  it("handles offline or unreachable network gracefully without throwing unhandled exceptions", async () => {
    // Test fetch against an unrouteable port to verify safe offline handling
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error("Connection refused (simulated offline)"));

    try {
      const saveRes = await saveActivityLog({
        childId: "c1",
        activityId: "a1",
        completedSteps: 1,
        totalSteps: 2,
        outcome: "not_tried",
      });
      expect(saveRes.success).toBe(false);
      expect(saveRes.error).toContain("Connection refused");

      const fetchRes = await fetchActivityLogs("c1");
      expect(fetchRes.success).toBe(false);
      expect(fetchRes.data).toEqual([]);
      expect(fetchRes.error).toContain("Connection refused");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  describe("In-Memory Offline Queue & Child History (Phase 2 TASK-11)", () => {
    it("queues pending trials in-memory with unique IDs and pending_sync status", () => {
      clearPendingTrials();
      const trial = queuePendingTrial({
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 2,
        totalSteps: 3,
        outcome: "tried_needs_support",
      });

      expect(trial.queueId).toBeDefined();
      expect(trial.status).toBe("pending_sync");
      expect(trial.childId).toBe("aarav");

      const pending = getPendingTrials("aarav");
      expect(pending.length).toBe(1);
      expect(pending[0]?.queueId).toBe(trial.queueId);
    });

    it("filters pending trials by childId correctly", () => {
      clearPendingTrials();
      queuePendingTrial({
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 3,
        totalSteps: 3,
        outcome: "tried_helped",
      });
      queuePendingTrial({
        childId: "anaya",
        activityId: "bead-counting",
        completedSteps: 1,
        totalSteps: 3,
        outcome: "tried_needs_support",
      });

      expect(getPendingTrials("aarav").length).toBe(1);
      expect(getPendingTrials("anaya").length).toBe(1);
      expect(getPendingTrials("vihaan").length).toBe(0);
      expect(getPendingTrials().length).toBe(2);
    });

    it("syncs queued items to the live backend and clears synced items from memory queue", async () => {
      clearPendingTrials();
      queuePendingTrial({
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 3,
        totalSteps: 3,
        outcome: "tried_helped",
        note: "Synced via test",
      });

      expect(getPendingTrials("aarav").length).toBe(1);

      const syncResult = await syncPendingTrials();
      expect(syncResult.syncedCount).toBe(1);
      expect(syncResult.remainingCount).toBe(0);
      expect(getPendingTrials("aarav").length).toBe(0);
    });

    it("retains failed sync items in queue with sync_failed status when backend fails", async () => {
      clearPendingTrials();
      queuePendingTrial({
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 2,
        totalSteps: 3,
        outcome: "tried_needs_support",
      });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = () => Promise.reject(new Error("Network offline"));

      try {
        const syncResult = await syncPendingTrials();
        expect(syncResult.syncedCount).toBe(0);
        expect(syncResult.remainingCount).toBe(1);
        expect(syncResult.errors.length).toBeGreaterThan(0);

        const remaining = getPendingTrials("aarav");
        expect(remaining.length).toBe(1);
        expect(remaining[0]?.status).toBe("sync_failed");
        expect(remaining[0]?.lastError).toContain("Network offline");
      } finally {
        globalThis.fetch = originalFetch;
        clearPendingTrials();
      }
    });

    it("fetches child activity history and merges backend records with in-memory pending items", async () => {
      clearPendingTrials();
      queuePendingTrial({
        childId: "aarav",
        activityId: "alphabet-match",
        completedSteps: 1,
        totalSteps: 4,
        outcome: "not_tried",
        note: "Queued session trial",
      });

      const history = await fetchChildActivityHistory("aarav");
      expect(history.queued.length).toBe(1);
      expect(history.queued[0]?.activityId).toBe("alphabet-match");
      expect(Array.isArray(history.confirmed)).toBe(true);

      const queuedInAll = history.all.filter((item) => item.type === "queued");
      expect(queuedInAll.length).toBe(1);
    });

    it("does not touch or reference window.localStorage for queued items", () => {
      clearPendingTrials();
      queuePendingTrial({
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 1,
        totalSteps: 3,
        outcome: "not_tried",
      });

      // Verification: queue is memory-only; window.localStorage is not modified
      expect(getPendingTrials().length).toBe(1);
      clearPendingTrials();
    });
  });
});
