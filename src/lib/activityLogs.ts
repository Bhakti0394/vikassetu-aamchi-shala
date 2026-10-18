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
