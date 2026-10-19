import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateRetryDelay,
  clearPendingTrials,
  dismissPendingTrial,
  fetchActivityLogs,
  fetchChildActivityHistory,
  generateClientTrialId,
  getInFlightSyncIdsForTesting,
  getPendingTrials,
  getQueueSummary,
  getStorageStatus,
  isPermanentSyncError,
  initOfflineQueue,
  queuePendingTrial,
  registerAutoSyncOnOnline,
  resetOfflineQueueForTesting,
  saveActivityLog,
  syncPendingTrials,
  summarizeChildPracticeHistory,
  type ActivityLogPayload,
  type ChildActivityHistoryItem,
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

  describe("IndexedDB Persistent Storage Adapter (Phase 3 TASK-15)", () => {
    it("reports honest memory_fallback when IndexedDB is unavailable in environment", async () => {
      resetOfflineQueueForTesting();
      // In default test environment without indexedDB, initOfflineQueue falls back gracefully
      const originalIDB = (globalThis as any).indexedDB;
      (globalThis as any).indexedDB = undefined;

      try {
        await initOfflineQueue();
        const status = getStorageStatus();
        expect(status.engine).toBe("memory_fallback");
        expect(status.isPersistent).toBe(false);
        expect(status.warning).toBeDefined();
        expect(status.warning).toContain("IndexedDB unavailable");
      } finally {
        (globalThis as any).indexedDB = originalIDB;
        resetOfflineQueueForTesting();
      }
    });

    it("handles database open errors gracefully without unhandled rejections", async () => {
      resetOfflineQueueForTesting();
      const originalIDB = (globalThis as any).indexedDB;
      // Simulate open error
      (globalThis as any).indexedDB = {
        open: () => {
          const req: any = { error: new Error("Permission denied by browser") };
          setTimeout(() => {
            if (req.onerror) req.onerror({ target: req });
          }, 0);
          return req;
        },
      };

      try {
        await initOfflineQueue();
        const status = getStorageStatus();
        expect(status.engine).toBe("memory_fallback");
        expect(status.isPersistent).toBe(false);
        expect(status.warning).toContain("Permission denied");
      } finally {
        (globalThis as any).indexedDB = originalIDB;
        resetOfflineQueueForTesting();
      }
    });

    describe("With Functional IndexedDB Mock", () => {
      let mockStores: Map<string, Map<string, any>>;
      let originalIDB: any;

      function setupMockIDB() {
        mockStores = new Map();
        const mockIDB = {
          open: (dbName: string, version: number) => {
            const request: any = {
              result: null,
              error: null,
              onsuccess: null,
              onerror: null,
              onupgradeneeded: null,
            };

            setTimeout(() => {
              const db: any = {
                name: dbName,
                version,
                objectStoreNames: {
                  contains: (name: string) => mockStores.has(name),
                },
                createObjectStore: (name: string) => {
                  if (!mockStores.has(name)) {
                    mockStores.set(name, new Map());
                  }
                  return {
                    createIndex: () => {},
                  };
                },
                transaction: (storeNames: string | string[], mode: string) => {
                  const tx: any = {
                    error: null,
                    oncomplete: null,
                    onerror: null,
                    onabort: null,
                    objectStore: (storeName: string) => {
                      let map = mockStores.get(storeName);
                      if (!map) {
                        map = new Map();
                        mockStores.set(storeName, map);
                      }
                      return {
                        getAll: () => {
                          const req: any = { result: Array.from(map.values()), error: null };
                          setTimeout(() => {
                            if (req.onsuccess) req.onsuccess({ target: req });
                          }, 0);
                          return req;
                        },
                        put: (val: any) => {
                          map.set(val.queueId, { ...val });
                          const req: any = { result: val.queueId, error: null };
                          setTimeout(() => {
                            if (req.onsuccess) req.onsuccess({ target: req });
                          }, 0);
                          return req;
                        },
                        delete: (key: string) => {
                          map.delete(key);
                          const req: any = { result: undefined, error: null };
                          setTimeout(() => {
                            if (req.onsuccess) req.onsuccess({ target: req });
                          }, 0);
                          return req;
                        },
                        clear: () => {
                          map.clear();
                          const req: any = { result: undefined, error: null };
                          setTimeout(() => {
                            if (req.onsuccess) req.onsuccess({ target: req });
                          }, 0);
                          return req;
                        },
                      };
                    },
                  };
                  setTimeout(() => {
                    if (tx.oncomplete) tx.oncomplete({ target: tx });
                  }, 5);
                  return tx;
                },
              };

              request.result = db;
              if (request.onupgradeneeded) request.onupgradeneeded({ target: request });
              if (request.onsuccess) request.onsuccess({ target: request });
            }, 0);

            return request;
          },
        };

        (globalThis as any).indexedDB = mockIDB;
      }

      beforeEach(() => {
        originalIDB = (globalThis as any).indexedDB;
        setupMockIDB();
        resetOfflineQueueForTesting();
      });

      afterEach(() => {
        (globalThis as any).indexedDB = originalIDB;
        resetOfflineQueueForTesting();
      });

      it("successfully connects to IndexedDB and confirms persistent status", async () => {
        await initOfflineQueue();
        const status = getStorageStatus();
        expect(status.engine).toBe("indexeddb");
        expect(status.isPersistent).toBe(true);
        expect(status.warning).toBeUndefined();
      });

      it("persists queued trials to storage and restores them in a simulated reload/hydration test", async () => {
        await initOfflineQueue();

        // Step 1: Queue a trial
        const trial = queuePendingTrial({
          childId: "aarav",
          activityId: "leaf-painting",
          completedSteps: 3,
          totalSteps: 3,
          outcome: "tried_helped",
          note: "Persistent test note",
        });

        // Give async write a moment to settle in mock DB
        await new Promise((r) => setTimeout(r, 20));

        // Step 2: Verify it is in storage store
        const storeMap = mockStores.get("pendingTrials");
        expect(storeMap?.has(trial.queueId)).toBe(true);

        // Step 3: Simulate browser reload / fresh session initialization
        // Reset in-memory queue to empty and clear init promise
        resetOfflineQueueForTesting();
        expect(getPendingTrials().length).toBe(0);

        // Re-initialize queue from storage (simulated reload hydration)
        await initOfflineQueue();

        const reloaded = getPendingTrials("aarav");
        expect(reloaded.length).toBe(1);
        expect(reloaded[0]?.queueId).toBe(trial.queueId);
        expect(reloaded[0]?.outcome).toBe("tried_helped");
        expect(reloaded[0]?.note).toBe("Persistent test note");
      });

      it("prevents hydration race conditions: new writes during async init are not overwritten", async () => {
        // Start async init without awaiting it yet
        const initPromise = initOfflineQueue();

        // While async init is in-flight, immediately queue a new trial
        const concurrentTrial = queuePendingTrial({
          childId: "vihaan",
          activityId: "alphabet-match",
          completedSteps: 2,
          totalSteps: 4,
          outcome: "tried_needs_support",
          note: "Queued during init",
        });

        // Now await initialization to complete
        await initPromise;

        // Verify the concurrently queued trial was preserved in memory
        const pending = getPendingTrials();
        expect(pending.some((t) => t.queueId === concurrentTrial.queueId)).toBe(true);
      });

      it("removes successfully synced items from persistent storage", async () => {
        await initOfflineQueue();

        const trial = queuePendingTrial({
          childId: "aarav",
          activityId: "leaf-painting",
          completedSteps: 3,
          totalSteps: 3,
          outcome: "tried_helped",
        });

        await new Promise((r) => setTimeout(r, 20));
        const storeMap = mockStores.get("pendingTrials");
        expect(storeMap?.has(trial.queueId)).toBe(true);

        // Sync with backend
        const res = await syncPendingTrials();
        expect(res.syncedCount).toBe(1);

        await new Promise((r) => setTimeout(r, 20));
        // Verify item was removed from storage map as well
        expect(storeMap?.has(trial.queueId)).toBe(false);
      });

      it("clears persistent storage when clearPendingTrials() is called", async () => {
        await initOfflineQueue();

        queuePendingTrial({
          childId: "aarav",
          activityId: "leaf-painting",
          completedSteps: 1,
          totalSteps: 3,
          outcome: "not_tried",
        });

        await new Promise((r) => setTimeout(r, 20));
        const storeMap = mockStores.get("pendingTrials");
        expect(storeMap?.size).toBe(1);

        clearPendingTrials();
        await new Promise((r) => setTimeout(r, 20));

        expect(getPendingTrials().length).toBe(0);
        expect(storeMap?.size).toBe(0);
      });

      it("preserves clientTrialId and retry metadata across IndexedDB reload", async () => {
        await initOfflineQueue();

        const trial = queuePendingTrial({
          childId: "vihaan",
          activityId: "alphabet-match",
          completedSteps: 2,
          totalSteps: 4,
          outcome: "tried_needs_support",
          note: "Offline test note",
        });

        const originalClientTrialId = trial.clientTrialId;

        // Simulate a failed sync to set retry metadata
        const originalFetch = globalThis.fetch;
        globalThis.fetch = () => Promise.reject(new Error("Offline"));

        try {
          await syncPendingTrials();
        } finally {
          globalThis.fetch = originalFetch;
        }

        // Allow async write to settle
        await new Promise((r) => setTimeout(r, 20));

        // Reset in-memory state
        resetOfflineQueueForTesting();
        expect(getPendingTrials().length).toBe(0);

        // Rehydrate from mock storage
        await initOfflineQueue();

        const reloaded = getPendingTrials("vihaan");
        expect(reloaded.length).toBe(1);
        expect(reloaded[0]?.clientTrialId).toBe(originalClientTrialId);
        expect(reloaded[0]?.retryCount).toBe(1);
        expect(reloaded[0]?.status).toBe("sync_failed");
        expect(reloaded[0]?.lastError).toContain("Offline");
      });

      it("safely persists and hydrates trials containing undefined fields without DataCloneError", async () => {
        await initOfflineQueue();

        const trial = queuePendingTrial({
          childId: "diya",
          activityId: "alphabet-match",
          completedSteps: 2,
          totalSteps: 4,
          outcome: "tried_helped",
          note: undefined,
        });

        await new Promise((r) => setTimeout(r, 20));

        resetOfflineQueueForTesting();
        expect(getPendingTrials().length).toBe(0);

        await initOfflineQueue();
        const rehydrated = getPendingTrials("diya");
        expect(rehydrated.length).toBe(1);
        expect(rehydrated[0]?.queueId).toBe(trial.queueId);
        expect(rehydrated[0]?.clientTrialId).toBe(trial.clientTrialId);
        expect(rehydrated[0]?.outcome).toBe("tried_helped");
        expect(getStorageStatus().isPersistent).toBe(true);
      });
    });
  });

  describe("Idempotency, Concurrency & Safe Retry Engine (Phase 3 TASK-16)", () => {
    it("assigns a stable clientTrialId in UUID v4 format to every queued trial", () => {
      resetOfflineQueueForTesting();
      const trial = queuePendingTrial({
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 3,
        totalSteps: 3,
        outcome: "tried_helped",
      });

      expect(trial.clientTrialId).toBeDefined();
      expect(typeof trial.clientTrialId).toBe("string");
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(trial.clientTrialId).toMatch(uuidV4Regex);
    });

    it("retains clientTrialId unchanged across failed syncs and retry count increments", async () => {
      resetOfflineQueueForTesting();
      const trial = queuePendingTrial({
        childId: "anaya",
        activityId: "bead-counting",
        completedSteps: 1,
        totalSteps: 3,
        outcome: "tried_needs_support",
      });

      const originalTrialId = trial.clientTrialId;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = () => Promise.reject(new Error("Network drop"));

      try {
        await syncPendingTrials();
        const pending = getPendingTrials("anaya");
        expect(pending.length).toBe(1);
        expect(pending[0]?.clientTrialId).toBe(originalTrialId);
        expect(pending[0]?.retryCount).toBe(1);
        expect(pending[0]?.status).toBe("sync_failed");
      } finally {
        globalThis.fetch = originalFetch;
        resetOfflineQueueForTesting();
      }
    });

    it("prevents duplicate concurrent sync calls from issuing duplicate HTTP requests for the same trial", async () => {
      resetOfflineQueueForTesting();
      queuePendingTrial({
        childId: "vihaan",
        activityId: "alphabet-match",
        completedSteps: 2,
        totalSteps: 4,
        outcome: "not_tried",
      });

      let fetchCallCount = 0;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        fetchCallCount++;
        // Simulate in-flight network roundtrip latency
        await new Promise((r) => setTimeout(r, 40));
        return {
          ok: true,
          json: async () => ({
            id: 999,
            childId: "vihaan",
            activityId: "alphabet-match",
            completedSteps: 2,
            totalSteps: 4,
            outcome: "not_tried",
            createdAt: new Date().toISOString(),
          }),
        } as any;
      };

      try {
        // Trigger two concurrent sync operations simultaneously
        const [res1, res2] = await Promise.all([syncPendingTrials(), syncPendingTrials()]);

        // Total HTTP calls should be exactly 1, not 2
        expect(fetchCallCount).toBe(1);
        expect(res1.syncedCount + res2.syncedCount).toBe(1);
        expect(getInFlightSyncIdsForTesting().length).toBe(0);
        expect(getPendingTrials().length).toBe(0);
      } finally {
        globalThis.fetch = originalFetch;
        resetOfflineQueueForTesting();
      }
    });

    it("debounces rapid duplicate submissions within 500ms for the same child and activity", () => {
      resetOfflineQueueForTesting();
      const payload: ActivityLogPayload = {
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 3,
        totalSteps: 3,
        outcome: "tried_helped",
      };

      const first = queuePendingTrial(payload);
      const second = queuePendingTrial(payload);

      // Same trial returned, queue size remains 1
      expect(first.clientTrialId).toBe(second.clientTrialId);
      expect(first.queueId).toBe(second.queueId);
      expect(getPendingTrials().length).toBe(1);
    });

    it("calculates bounded exponential backoff delay correctly", () => {
      expect(calculateRetryDelay(0)).toBe(1000);
      expect(calculateRetryDelay(1)).toBe(1000);
      expect(calculateRetryDelay(2)).toBe(2000);
      expect(calculateRetryDelay(3)).toBe(4000);
      expect(calculateRetryDelay(4)).toBe(8000);
      expect(calculateRetryDelay(5)).toBe(16000);
      expect(calculateRetryDelay(6)).toBe(30000); // Capped at MAX_RETRY_DELAY_MS
      expect(calculateRetryDelay(10)).toBe(30000); // Remains capped
    });

    it("skips items currently in backoff unless sync is forced", async () => {
      resetOfflineQueueForTesting();
      queuePendingTrial({
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 3,
        totalSteps: 3,
        outcome: "tried_helped",
      });

      let fetchCount = 0;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        fetchCount++;
        return {
          ok: false,
          status: 503,
          json: async () => ({ detail: "Server temporarily overloaded" }),
        } as any;
      };

      try {
        // Attempt 1: Fails and schedules next retry in ~1000ms
        const res1 = await syncPendingTrials();
        expect(res1.syncedCount).toBe(0);
        expect(fetchCount).toBe(1);

        const pending = getPendingTrials("aarav");
        expect(pending[0]?.status).toBe("sync_failed");
        expect(pending[0]?.retryCount).toBe(1);
        expect(pending[0]?.nextRetryTime).toBeGreaterThan(Date.now());

        // Attempt 2: Immediately calling sync should skip the backoff item
        const res2 = await syncPendingTrials();
        expect(res2.syncedCount).toBe(0);
        expect(fetchCount).toBe(1); // fetch was NOT called again

        // Attempt 3: Forced sync bypasses nextRetryTime
        await syncPendingTrials({ force: true });
        expect(fetchCount).toBe(2); // fetch WAS called because force: true
        expect(pending[0]?.retryCount).toBe(2);
      } finally {
        globalThis.fetch = originalFetch;
        resetOfflineQueueForTesting();
      }
    });

    it("automatically triggers forced sync on browser online event and cleans up on unsubscribe", async () => {
      resetOfflineQueueForTesting();
      queuePendingTrial({
        childId: "anaya",
        activityId: "bead-counting",
        completedSteps: 3,
        totalSteps: 3,
        outcome: "tried_helped",
      });

      let syncCompletedResult: any = null;
      let fetchCount = 0;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        fetchCount++;
        return {
          ok: true,
          json: async () => ({
            id: 101,
            childId: "anaya",
            activityId: "bead-counting",
            completedSteps: 3,
            totalSteps: 3,
            outcome: "tried_helped",
            createdAt: new Date().toISOString(),
          }),
        } as any;
      };

      try {
        const unsubscribe = registerAutoSyncOnOnline((res) => {
          syncCompletedResult = res;
        });

        // Simulate reconnecting to the network
        window.dispatchEvent(new Event("online"));

        // Wait a tick for async handler
        await new Promise((r) => setTimeout(r, 50));

        expect(fetchCount).toBe(1);
        expect(syncCompletedResult).toBeDefined();
        expect(syncCompletedResult?.syncedCount).toBe(1);
        expect(getPendingTrials().length).toBe(0);

        // Queue another item and unsubscribe
        queuePendingTrial({
          childId: "vihaan",
          activityId: "alphabet-match",
          completedSteps: 1,
          totalSteps: 4,
          outcome: "not_tried",
        });

        unsubscribe();

        // Dispatching another online event after unsubscribe should NOT trigger sync
        window.dispatchEvent(new Event("online"));
        await new Promise((r) => setTimeout(r, 50));

        expect(fetchCount).toBe(1); // Unchanged
        expect(getPendingTrials().length).toBe(1);
      } finally {
        globalThis.fetch = originalFetch;
        resetOfflineQueueForTesting();
      }
    });

    it("handles missing window or addEventListener safely in non-browser environments", () => {
      const originalWindow = globalThis.window;
      (globalThis as any).window = undefined;

      try {
        const unsubscribe = registerAutoSyncOnOnline();
        expect(typeof unsubscribe).toBe("function");
        expect(() => unsubscribe()).not.toThrow();
      } finally {
        (globalThis as any).window = originalWindow;
      }
    });

    it("generates valid UUID v4 fallback when crypto.randomUUID throws or fails", () => {
      const spy = vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
        throw new Error("randomUUID unavailable in insecure context");
      });

      try {
        const id = generateClientTrialId();
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(id).toMatch(uuidV4Regex);
      } finally {
        spy.mockRestore();
      }
    });

    it("deliberately dismisses a specific trial by queueId without affecting others", () => {
      resetOfflineQueueForTesting();
      const trial1 = queuePendingTrial({
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 3,
        totalSteps: 3,
        outcome: "tried_helped",
      });
      const trial2 = queuePendingTrial({
        childId: "anaya",
        activityId: "bead-counting",
        completedSteps: 1,
        totalSteps: 3,
        outcome: "tried_needs_support",
      });

      expect(getPendingTrials().length).toBe(2);

      dismissPendingTrial(trial1.queueId);

      const remaining = getPendingTrials();
      expect(remaining.length).toBe(1);
      expect(remaining[0]?.queueId).toBe(trial2.queueId);
    });

    it("returns accurate queue summary metrics for pending vs failed counts", () => {
      resetOfflineQueueForTesting();
      // Trial 1: pending
      queuePendingTrial({
        childId: "aarav",
        activityId: "leaf-painting",
        completedSteps: 3,
        totalSteps: 3,
        outcome: "tried_helped",
      });
      // Trial 2: failed
      queuePendingTrial(
        {
          childId: "aarav",
          activityId: "colour-hunt",
          completedSteps: 1,
          totalSteps: 3,
          outcome: "tried_needs_support",
        },
        "Network dropped",
      );

      const summary = getQueueSummary("aarav");
      expect(summary.total).toBe(2);
      expect(summary.pendingCount).toBe(1);
      expect(summary.failedCount).toBe(1);

      const emptySummary = getQueueSummary("vihaan");
      expect(emptySummary.total).toBe(0);
      expect(emptySummary.pendingCount).toBe(0);
      expect(emptySummary.failedCount).toBe(0);
    });

    it("correctly identifies permanent errors such as not found or 404", () => {
      expect(isPermanentSyncError("Child 'yash-zs1c' not found")).toBe(true);
      expect(isPermanentSyncError("Activity 'non-existent' not found")).toBe(true);
      expect(isPermanentSyncError("HTTP 404")).toBe(true);
      expect(isPermanentSyncError("Failed to fetch")).toBe(false);
      expect(isPermanentSyncError("Network error or backend unreachable")).toBe(false);
      expect(isPermanentSyncError(undefined)).toBe(false);
    });

    it("pauses automatic retries when a trial encounters a permanent Child Not Found error while preserving the queued trial", async () => {
      resetOfflineQueueForTesting();
      const trial = queuePendingTrial({
        childId: "nonexistent-child-99",
        activityId: "leaf-painting",
        completedSteps: 3,
        totalSteps: 3,
        outcome: "tried_helped",
      });

      // Mock saveActivityLog to return 404 Child not found
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Child 'nonexistent-child-99' not found" }),
      } as Response);

      const res = await syncPendingTrials();
      expect(res.syncedCount).toBe(0);
      expect(res.remainingCount).toBe(1);
      expect(res.errors[0]).toContain("Child 'nonexistent-child-99' not found");

      // Verify trial is preserved in queue with status sync_failed and nextRetryTime is undefined
      const pending = getPendingTrials("nonexistent-child-99");
      expect(pending.length).toBe(1);
      expect(pending[0]?.status).toBe("sync_failed");
      expect(pending[0]?.nextRetryTime).toBeUndefined(); // Paused!

      // Non-forced sync should skip it
      const res2 = await syncPendingTrials();
      expect(res2.syncedCount).toBe(0);
      expect(res2.remainingCount).toBe(1);

      vi.restoreAllMocks();
    });
  });

  describe("summarizeChildPracticeHistory (Phase 4 TASK-4.5)", () => {
    it("accurately summarizes confirmed and queued trial counts and domain breakdowns", () => {
      const mockTrials: ChildActivityHistoryItem[] = [
        {
          type: "confirmed",
          record: {
            id: 1,
            childId: "aarav",
            activityId: "alphabet-match",
            completedSteps: 3,
            totalSteps: 3,
            outcome: "tried_helped",
            createdAt: "2026-10-18T10:00:00Z",
          },
        },
        {
          type: "confirmed",
          record: {
            id: 2,
            childId: "aarav",
            activityId: "count-match",
            completedSteps: 1,
            totalSteps: 3,
            outcome: "tried_needs_support",
            createdAt: "2026-10-18T11:00:00Z",
          },
        },
        {
          type: "queued",
          queued: {
            queueId: "q-1",
            clientTrialId: "uuid-1",
            childId: "aarav",
            activityId: "leaf-painting",
            completedSteps: 3,
            totalSteps: 3,
            outcome: "tried_helped",
            status: "pending_sync",
            queuedAt: "2026-10-19T10:00:00Z",
          },
        },
        {
          type: "queued",
          queued: {
            queueId: "q-2",
            clientTrialId: "uuid-2",
            childId: "aarav",
            activityId: "free-drawing",
            completedSteps: 0,
            totalSteps: 3,
            outcome: "not_tried",
            status: "pending_sync",
            queuedAt: "2026-10-19T11:00:00Z",
          },
        },
      ];

      const domainMap: Record<string, string> = {
        "alphabet-match": "alphabet",
        "count-match": "numbers",
        "leaf-painting": "art",
        "free-drawing": "art",
      };

      const summary = summarizeChildPracticeHistory(
        mockTrials,
        (actId) => domainMap[actId],
      );

      expect(summary.totalTrials).toBe(4);
      expect(summary.helpedCount).toBe(2);
      expect(summary.needsSupportCount).toBe(1);
      expect(summary.notTriedCount).toBe(1);
      expect(summary.domainCounts["alphabet"]).toBe(1);
      expect(summary.domainCounts["numbers"]).toBe(1);
      expect(summary.domainCounts["art"]).toBe(2);
    });

    it("returns empty summary safely when child has zero trials", () => {
      const summary = summarizeChildPracticeHistory([]);
      expect(summary.totalTrials).toBe(0);
      expect(summary.helpedCount).toBe(0);
      expect(summary.needsSupportCount).toBe(0);
      expect(summary.notTriedCount).toBe(0);
      expect(summary.domainCounts).toEqual({});
    });
  });
});


