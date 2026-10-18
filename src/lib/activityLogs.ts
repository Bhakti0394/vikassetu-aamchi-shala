export type ActivityLogOutcome = "tried_helped" | "tried_needs_support" | "not_tried";

export type ActivityLogPayload = {
  childId: string;
  activityId: string;
  completedSteps: number;
  totalSteps: number;
  outcome: ActivityLogOutcome;
  note?: string | undefined;
};

export type ActivityLogRecord = ActivityLogPayload & {
  id: number;
  createdAt: string;
};

const API_BASE = "http://localhost:8000/api";

/**
 * Saves an activity trial log to the backend.
 * Returns a result object so the caller can display inline messages without crashing.
 */
export async function saveActivityLog(
  payload: ActivityLogPayload,
): Promise<{ success: boolean; data?: ActivityLogRecord; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/activity-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      let msg = `HTTP ${res.status}`;
      if (errJson && errJson.detail) {
        msg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
      return { success: false, error: msg };
    }

    const data = (await res.json()) as ActivityLogRecord;
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error or backend unreachable";
    return { success: false, error: message };
  }
}

/**
 * Fetches activity trial history from the backend.
 * Falls back to an empty list cleanly if backend is unavailable.
 */
export async function fetchActivityLogs(
  childId?: string,
): Promise<{ success: boolean; data: ActivityLogRecord[]; error?: string }> {
  try {
    const url = childId
      ? `${API_BASE}/activity-logs?child_id=${encodeURIComponent(childId)}`
      : `${API_BASE}/activity-logs`;

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return { success: false, data: [], error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as ActivityLogRecord[];
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unreachable";
    return { success: false, data: [], error: message };
  }
}

export type QueuedActivityTrial = ActivityLogPayload & {
  queueId: string;
  queuedAt: string;
  status: "pending_sync" | "sync_failed";
  lastError?: string | undefined;
};

export type ChildActivityHistoryItem =
  | {
      type: "confirmed";
      record: ActivityLogRecord;
    }
  | {
      type: "queued";
      queued: QueuedActivityTrial;
    };

/**
 * In-memory storage for offline activity trial logs.
 *
 * NOTE: This queue is stored in memory ONLY during the current browser session.
 * It does NOT use localStorage, sessionStorage, or IndexedDB.
 * Queued records will be lost if the browser tab is refreshed or closed.
 */
let memoryQueue: QueuedActivityTrial[] = [];
let isSyncing = false;

/**
 * Adds an unconfirmed activity trial to the in-memory offline queue.
 */
export function queuePendingTrial(
  payload: ActivityLogPayload,
  error?: string,
): QueuedActivityTrial {
  const item: QueuedActivityTrial = {
    ...payload,
    queueId: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    queuedAt: new Date().toISOString(),
    status: error ? "sync_failed" : "pending_sync",
    lastError: error,
  };
  memoryQueue.push(item);
  return item;
}

/**
 * Returns pending in-memory queued trials, optionally filtered by child ID.
 */
export function getPendingTrials(childId?: string): QueuedActivityTrial[] {
  if (!childId) return [...memoryQueue];
  return memoryQueue.filter((item) => item.childId === childId);
}

/**
 * Clears the in-memory queue.
 */
export function clearPendingTrials(): void {
  memoryQueue = [];
}

/**
 * Flushes in-memory queued trials to the backend.
 * Successfully saved items are removed from the queue.
 * Guarded against concurrent duplicate sync attempts.
 */
export async function syncPendingTrials(): Promise<{
  syncedCount: number;
  remainingCount: number;
  errors: string[];
}> {
  if (isSyncing) {
    return {
      syncedCount: 0,
      remainingCount: memoryQueue.length,
      errors: ["Sync already in progress"],
    };
  }

  isSyncing = true;
  let syncedCount = 0;
  const errors: string[] = [];

  try {
    const toSync = [...memoryQueue];
    for (const item of toSync) {
      const payload: ActivityLogPayload = {
        childId: item.childId,
        activityId: item.activityId,
        completedSteps: item.completedSteps,
        totalSteps: item.totalSteps,
        outcome: item.outcome,
        note: item.note,
      };

      const res = await saveActivityLog(payload);
      if (res.success && res.data) {
        // Remove successfully saved item from queue
        memoryQueue = memoryQueue.filter((q) => q.queueId !== item.queueId);
        syncedCount++;
      } else {
        // Retain in queue, mark sync_failed
        const err = res.error || "Sync failed";
        errors.push(`${item.activityId}: ${err}`);
        const current = memoryQueue.find((q) => q.queueId === item.queueId);
        if (current) {
          current.status = "sync_failed";
          current.lastError = err;
        }
      }
    }
  } finally {
    isSyncing = false;
  }

  return {
    syncedCount,
    remainingCount: memoryQueue.length,
    errors,
  };
}

/**
 * Fetches confirmed backend records for a child and merges them with any in-memory
 * queued trials, distinguishing confirmed from pending records.
 */
export async function fetchChildActivityHistory(childId: string): Promise<{
  confirmed: ActivityLogRecord[];
  queued: QueuedActivityTrial[];
  all: ChildActivityHistoryItem[];
  error?: string | undefined;
}> {
  const fetchRes = await fetchActivityLogs(childId);
  const queued = getPendingTrials(childId);

  const confirmed = fetchRes.data;
  const all: ChildActivityHistoryItem[] = [
    ...queued.map((q) => ({ type: "queued" as const, queued: q })),
    ...confirmed.map((c) => ({ type: "confirmed" as const, record: c })),
  ];

  return {
    confirmed,
    queued,
    all,
    error: fetchRes.error,
  };
}
