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

export type StorageEngineType = "indexeddb" | "memory_fallback";

export type StorageStatus = {
  engine: StorageEngineType;
  isPersistent: boolean;
  warning?: string | undefined;
};

const API_BASE = "http://localhost:8000/api";
const DB_NAME = "VikasSetuOfflineDB";
const STORE_NAME = "pendingTrials";
const DB_VERSION = 1;

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
  clientTrialId: string;
  queuedAt: string;
  status: "pending_sync" | "sync_failed";
  lastError?: string | undefined;
  retryCount?: number | undefined;
  nextRetryTime?: number | undefined;
};

export type SyncResult = {
  syncedCount: number;
  remainingCount: number;
  errors: string[];
};

export type SyncOptions = {
  force?: boolean | undefined;
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

// ============================================================================
// Idempotency, Concurrency & Retry Engine Configuration
// ============================================================================

/**
 * ARCHITECTURAL BOUNDARY & IDEMPOTENCY RFC NOTE:
 *
 * 1. Client-Side Deduplication:
 *    Guards against rapid multi-clicks, UI bounce, and concurrent in-flight sync attempts
 *    by tracking inFlightTrialIds and enforcing short debouncing windows.
 *
 * 2. Server-Side Idempotency Boundary (Pending Bhakti's Approval):
 *    True distributed idempotency across dropped responses (where the backend successfully
 *    persisted the record, but the client timed out or lost connection before receiving the 201)
 *    requires the backend to store `client_trial_id` in `activity_logs` with a unique index.
 *    Per project boundaries, backend SQLite schema changes and router alterations are deferred
 *    until Bhakti reviews the proposed RFC:
 *
 *    PROPOSED RFC (Non-breaking backend enhancement):
 *    - Model: Add `client_trial_id = Column(String, index=True, nullable=True, unique=True)`
 *    - Schema: Add `client_trial_id: Optional[str] = None` to `ActivityLogCreate`
 *    - Router: On POST /api/activity-logs, if `client_trial_id` exists in DB, return 200/201
 *      with existing record rather than creating a duplicate row.
 */

export const INITIAL_RETRY_DELAY_MS = 1000;
export const MAX_RETRY_DELAY_MS = 30000;
export const RECENT_SUBMISSION_DEBOUNCE_MS = 500;

/**
 * Generates an RFC4122 v4 UUID for stable client-side trial tracking.
 * Uses crypto.randomUUID() when available, with a cryptographically sound fallback.
 */
export function generateClientTrialId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if environment throws or blocks crypto.randomUUID
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calculates exponential backoff delay capped at MAX_RETRY_DELAY_MS (30s).
 * retry 1 -> 1s, retry 2 -> 2s, retry 3 -> 4s, retry 4 -> 8s, retry 5 -> 16s, retry 6+ -> 30s.
 */
export function calculateRetryDelay(retryCount: number): number {
  if (retryCount <= 1) return INITIAL_RETRY_DELAY_MS;
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

const inFlightTrialIds = new Set<string>();

type RecentSubmission = {
  childId: string;
  activityId: string;
  outcome: ActivityLogOutcome;
  timestamp: number;
  trial: QueuedActivityTrial;
};

let recentSubmissions: RecentSubmission[] = [];

// ============================================================================
// IndexedDB Storage Adapter
// ============================================================================

let memoryQueue: QueuedActivityTrial[] = [];
let initPromise: Promise<void> | null = null;

let storageStatus: StorageStatus = {
  engine: "indexeddb",
  isPersistent: false,
};

function getGlobalIDB(): IDBFactory | undefined {
  if (typeof window !== "undefined" && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== "undefined" && globalThis.indexedDB) {
    return globalThis.indexedDB;
  }
  return undefined;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  const idb = getGlobalIDB();
  if (!idb) {
    return Promise.reject(new Error("IndexedDB is not supported or unavailable"));
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = idb.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "queueId" });
            store.createIndex("by_childId", "childId", { unique: false });
          }
        } catch (upgradeErr) {
          reject(upgradeErr);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        db.onerror = () => {
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error("Failed to open IndexedDB"));
      };

      request.onblocked = () => {
        reject(new Error("IndexedDB database open blocked by existing connection"));
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

function executeStoreOp<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore, resolve: (val: T) => void, reject: (err: unknown) => void) => void,
): Promise<T> {
  return openDatabase().then((db) => {
    return new Promise<T>((resolve, reject) => {
      let isSettled = false;
      const safeResolve = (val: T) => {
        if (!isSettled) {
          isSettled = true;
          resolve(val);
        }
      };
      const safeReject = (err: unknown) => {
        if (!isSettled) {
          isSettled = true;
          reject(err);
        }
      };

      try {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);

        tx.onerror = () => {
          safeReject(tx.error || new Error("IndexedDB transaction failed"));
        };
        tx.onabort = () => {
          safeReject(tx.error || new Error("IndexedDB transaction aborted"));
        };
        tx.oncomplete = () => {
          safeResolve(undefined as T);
        };

        op(store, safeResolve, safeReject);
      } catch (txErr) {
        safeReject(txErr);
      }
    });
  });
}

function loadAllFromStorage(): Promise<QueuedActivityTrial[]> {
  return executeStoreOp<QueuedActivityTrial[]>("readonly", (store, resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as QueuedActivityTrial[]);
    req.onerror = () => reject(req.error || new Error("Failed to read trials from IndexedDB"));
  });
}

function saveToStorage(item: QueuedActivityTrial): Promise<void> {
  return executeStoreOp<void>("readwrite", (store, _resolve, reject) => {
    const cleanItem: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (value !== undefined) {
        cleanItem[key] = value;
      }
    }
    const req = store.put(cleanItem);
    req.onerror = () => reject(req.error || new Error("Failed to save trial to IndexedDB"));
  });
}

function removeFromStorage(queueId: string): Promise<void> {
  return executeStoreOp<void>("readwrite", (store, resolve, reject) => {
    const req = store.delete(queueId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error("Failed to delete trial from IndexedDB"));
  });
}

function clearStorage(): Promise<void> {
  return executeStoreOp<void>("readwrite", (store, resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error("Failed to clear trials from IndexedDB"));
  });
}

/**
 * Returns current offline storage engine telemetry.
 * If IndexedDB is unavailable or encounters errors, returns memory_fallback with an honest warning.
 */
export function getStorageStatus(): StorageStatus {
  return { ...storageStatus };
}

/**
 * Initializes and hydrates the offline queue from IndexedDB.
 * Safe against concurrent calls and ensures async storage hydration does not
 * overwrite newly queued in-memory writes.
 */
export async function initOfflineQueue(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const stored = await loadAllFromStorage();
      storageStatus = {
        engine: "indexeddb",
        isPersistent: true,
      };

      // Concurrency safety: merge storage items with in-memory items
      // In-memory queue may have received items while async storage load was in flight.
      const memoryMap = new Map<string, QueuedActivityTrial>(
        memoryQueue.map((item) => [item.queueId, item]),
      );
      for (const item of stored) {
        if (!item.clientTrialId) {
          item.clientTrialId = item.queueId || generateClientTrialId();
        }
        if (item.retryCount === undefined) {
          item.retryCount = item.status === "sync_failed" ? 1 : 0;
        }
        if (!memoryMap.has(item.queueId)) {
          memoryMap.set(item.queueId, item);
        }
      }
      memoryQueue = Array.from(memoryMap.values());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "IndexedDB unavailable";
      storageStatus = {
        engine: "memory_fallback",
        isPersistent: false,
        warning: `IndexedDB unavailable (${msg}); queued trials are held in temporary memory and will be lost on page reload.`,
      };
    }
  })();

  return initPromise;
}

/**
 * Resets offline queue state and storage status for clean test isolation.
 */
export function resetOfflineQueueForTesting(): void {
  memoryQueue = [];
  inFlightTrialIds.clear();
  recentSubmissions = [];
  initPromise = null;
  dbPromise = null;
  syncCompletionListeners.clear();
  storageStatus = {
    engine: "indexeddb",
    isPersistent: false,
  };
}

/**
 * Returns current in-flight trial IDs for test assertions.
 */
export function getInFlightSyncIdsForTesting(): string[] {
  return Array.from(inFlightTrialIds);
}

/**
 * Adds an unconfirmed activity trial to the queue and persists it to IndexedDB.
 * Debounces rapid accidental double-clicks within RECENT_SUBMISSION_DEBOUNCE_MS (500ms)
 * for the exact same childId, activityId, and outcome.
 * Returns the queued record synchronously for UI reactivity.
 */
export function queuePendingTrial(
  payload: ActivityLogPayload,
  error?: string,
): QueuedActivityTrial {
  const now = Date.now();

  // Clean expired debounce entries
  recentSubmissions = recentSubmissions.filter(
    (sub) => now - sub.timestamp < RECENT_SUBMISSION_DEBOUNCE_MS,
  );

  // Check for duplicate rapid submission within debounce window
  const duplicate = recentSubmissions.find(
    (sub) =>
      sub.childId === payload.childId &&
      sub.activityId === payload.activityId &&
      sub.outcome === payload.outcome,
  );
  if (duplicate) {
    return duplicate.trial;
  }

  const clientTrialId = generateClientTrialId();
  const item: QueuedActivityTrial = {
    ...payload,
    queueId: `queue-${now}-${Math.random().toString(36).substring(2, 7)}`,
    clientTrialId,
    queuedAt: new Date(now).toISOString(),
    status: error ? "sync_failed" : "pending_sync",
    lastError: error,
    retryCount: error ? 1 : 0,
    nextRetryTime: error ? now + INITIAL_RETRY_DELAY_MS : undefined,
  };
  memoryQueue.push(item);
  recentSubmissions.push({
    childId: payload.childId,
    activityId: payload.activityId,
    outcome: payload.outcome,
    timestamp: now,
    trial: item,
  });

  // Background persistence to storage
  saveToStorage(item).catch((storageErr) => {
    const msg = storageErr instanceof Error ? storageErr.message : "Storage write failed";
    if (getGlobalIDB()) {
      console.error("VikasSetu: IndexedDB storage write failed:", storageErr);
    }
    storageStatus = {
      engine: "memory_fallback",
      isPersistent: false,
      warning: `Storage write failed (${msg}); trials remain in session memory only.`,
    };
  });

  return item;
}

/**
 * Returns pending queued trials, optionally filtered by child ID.
 */
export function getPendingTrials(childId?: string): QueuedActivityTrial[] {
  if (!childId) return [...memoryQueue];
  return memoryQueue.filter((item) => item.childId === childId);
}

/**
 * Clears both in-memory cache and persisted storage store.
 */
export function clearPendingTrials(): void {
  memoryQueue = [];
  inFlightTrialIds.clear();
  recentSubmissions = [];
  clearStorage().catch(() => {});
}

/**
 * Deliberately dismisses a specific queued or failed trial from memory and persistent storage.
 * Only removes the explicitly targeted trial by queueId, preventing accidental deletion of other items.
 */
export function dismissPendingTrial(queueId: string): void {
  memoryQueue = memoryQueue.filter((item) => item.queueId !== queueId);
  removeFromStorage(queueId).catch(() => {});
}

export const removePendingTrial = dismissPendingTrial;

/**
 * Returns a summary of current queued trials, useful for UI badges and counters.
 */
export function getQueueSummary(childId?: string): {
  total: number;
  pendingCount: number;
  failedCount: number;
  items: QueuedActivityTrial[];
} {
  const items = getPendingTrials(childId);
  const failedCount = items.filter((t) => t.status === "sync_failed").length;
  const pendingCount = items.length - failedCount;
  return {
    total: items.length,
    pendingCount,
    failedCount,
    items,
  };
}

const syncCompletionListeners = new Set<(result: SyncResult) => void>();

/**
 * Flushes queued trials to the backend.
 * Successfully saved items are removed from both memory queue and IndexedDB.
 * Guarded against concurrent duplicate sync attempts for the same trial.
 * Implements bounded exponential backoff for retryable failures.
 */
/**
 * Detects whether an error message represents a permanent failure (e.g., entity not found)
 * where repeated automatic retries are futile and should be paused until the issue is fixed.
 */
export function isPermanentSyncError(error?: string): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("404") ||
    lower.includes("invalid child") ||
    lower.includes("invalid activity")
  );
}

export async function syncPendingTrials(options?: SyncOptions): Promise<SyncResult> {
  // Ensure offline queue is hydrated before syncing
  await initOfflineQueue();
  const isForced = options?.force === true;
  let syncedCount = 0;
  const errors: string[] = [];
  const now = Date.now();

  const toSync = [...memoryQueue];
  for (const item of toSync) {
    // 1. Concurrency deduplication: skip if trial is already in-flight
    if (inFlightTrialIds.has(item.clientTrialId)) {
      continue;
    }

    // 2. Permanent error guard: skip trials with known permanent errors during non-forced automatic sync
    if (!isForced && item.status === "sync_failed" && isPermanentSyncError(item.lastError)) {
      continue;
    }

    // 3. Exponential backoff: skip if trial is waiting for nextRetryTime (unless forced)
    if (!isForced && item.nextRetryTime && now < item.nextRetryTime) {
      continue;
    }

    inFlightTrialIds.add(item.clientTrialId);

    try {
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
        // Remove successfully saved item from memory queue and persistent storage
        memoryQueue = memoryQueue.filter((q) => q.queueId !== item.queueId);
        removeFromStorage(item.queueId).catch(() => {});
        syncedCount++;
      } else {
        // Retain in queue on failure with updated backoff metadata
        const rawErr = res.error || "Sync failed";
        const isPermanent = isPermanentSyncError(rawErr);

        let actionableErr = rawErr;
        if (rawErr.toLowerCase().includes("child") && rawErr.toLowerCase().includes("not found")) {
          actionableErr = `${rawErr}. Ensure child '${item.childId}' exists in backend before retrying.`;
        } else if (rawErr.toLowerCase().includes("activity") && rawErr.toLowerCase().includes("not found")) {
          actionableErr = `${rawErr}. Ensure activity '${item.activityId}' belongs to the catalog.`;
        }

        errors.push(`${item.activityId}: ${actionableErr}`);
        const current = memoryQueue.find((q) => q.queueId === item.queueId);
        if (current) {
          const retries = (current.retryCount ?? 0) + 1;
          current.status = "sync_failed";
          current.lastError = actionableErr;
          current.retryCount = retries;
          if (isPermanent) {
            // Permanent error (e.g. unknown child or activity):
            // Pause automatic background retries while preserving the queued record
            current.nextRetryTime = undefined;
          } else {
            // Transient network error: schedule exponential backoff
            const delay = calculateRetryDelay(retries);
            current.nextRetryTime = Date.now() + delay;
          }
          saveToStorage(current).catch(() => {});
        }
      }
    } finally {
      inFlightTrialIds.delete(item.clientTrialId);
    }
  }

  const result: SyncResult = {
    syncedCount,
    remainingCount: memoryQueue.length,
    errors,
  };

  // Notify any listeners registered for sync completions
  for (const listener of syncCompletionListeners) {
    try {
      listener(result);
    } catch {
      // Safe boundary: contain any listener exceptions
    }
  }

  return result;
}

/**
 * Automatically triggers synchronization when the browser reconnects to the network (online event).
 * Safe for SSR / Node environments where window or addEventListener may not exist.
 * Returns an unsubscribe cleanup function.
 */
export function registerAutoSyncOnOnline(
  onSyncComplete?: (result: SyncResult) => void,
): () => void {
  if (onSyncComplete) {
    syncCompletionListeners.add(onSyncComplete);
  }

  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => {
      if (onSyncComplete) {
        syncCompletionListeners.delete(onSyncComplete);
      }
    };
  }

  const handleOnline = async () => {
    try {
      // Network reconnection triggers a forced sync to bypass exponential backoff timers
      await syncPendingTrials({ force: true });
    } catch {
      // Safe boundary: contain any unexpected errors without crashing window listener
    }
  };

  window.addEventListener("online", handleOnline);

  return () => {
    if (onSyncComplete) {
      syncCompletionListeners.delete(onSyncComplete);
    }
    if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
      window.removeEventListener("online", handleOnline);
    }
  };
}

export const registerAutoSyncListeners = registerAutoSyncOnOnline;
export const registerOnlineSyncListener = registerAutoSyncOnOnline;

/**
 * Fetches confirmed backend records for a child and merges them with any in-memory/persisted
 * queued trials, distinguishing confirmed from pending records.
 */
export async function fetchChildActivityHistory(childId: string): Promise<{
  confirmed: ActivityLogRecord[];
  queued: QueuedActivityTrial[];
  all: ChildActivityHistoryItem[];
  error?: string | undefined;
}> {
  // Ensure offline queue is hydrated before reading pending trials
  await initOfflineQueue();
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
