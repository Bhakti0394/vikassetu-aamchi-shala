import { describe, expect, it } from "vitest";
import { fetchActivityLogs, saveActivityLog, type ActivityLogPayload } from "./activityLogs";

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
});
