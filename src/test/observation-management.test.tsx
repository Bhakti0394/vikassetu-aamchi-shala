import { describe, expect, it, vi, beforeEach } from "vitest";
import * as api from "@/lib/api";

describe("Observation Management API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchChildren fetches children successfully from the backend", async () => {
    const mockChildren = [
      {
        id: "aarav",
        name: "Aarav",
        age: 4,
        avatar: "👦🏽",
        tone: "teal",
        scores: { alphabet: 1, numbers: 2, colours: 3, art: 2, stories: 2 },
        strengths: ["Doing well in Colours & Shapes"],
        needs: ["More practice in Alphabet & Language"],
      },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockChildren,
    } as Response);

    const children = await api.fetchChildren();
    expect(children).toEqual(mockChildren);
    expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost:8000/api/children");
  });

  it("createObservation sends POST request and returns created observation", async () => {
    const payload: api.CreateObservationPayload = {
      childId: "aarav",
      domain: "alphabet",
      activityId: "alphabet-match",
      score: 3,
      note: "Recognized all uppercase letters.",
      date: "2026-10-18",
    };

    const mockResponse = {
      id: "obs-test1234",
      ...payload,
      isBaseline: false,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockResponse,
    } as Response);

    const result = await api.createObservation(payload);
    expect(result.id).toBe("obs-test1234");
    expect(result.score).toBe(3);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/observations",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
  });

  it("updateObservation sends PUT request and returns updated observation", async () => {
    const updateData: api.UpdateObservationPayload = {
      score: 2,
      note: "Updated observation note.",
    };

    const mockResponse = {
      id: "obs-test1234",
      childId: "aarav",
      domain: "alphabet",
      activityId: "alphabet-match",
      score: 2,
      note: "Updated observation note.",
      date: "2026-10-18",
      isBaseline: false,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await api.updateObservation("obs-test1234", updateData);
    expect(result.score).toBe(2);
    expect(result.note).toBe("Updated observation note.");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/observations/obs-test1234",
      expect.objectContaining({
        method: "PUT",
      })
    );
  });

  it("deleteObservation sends DELETE request and resolves", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 204,
    } as Response);

    await expect(api.deleteObservation("obs-test1234")).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/observations/obs-test1234",
      expect.objectContaining({
        method: "DELETE",
      })
    );
  });

  it("handles backend 422 error details cleanly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: "Activity 'alphabet-match' domain 'alphabet' does not match observation domain 'numbers'",
      }),
    } as Response);

    await expect(
      api.createObservation({
        childId: "aarav",
        domain: "numbers",
        activityId: "alphabet-match",
        score: 2,
        note: "Testing mismatch",
      })
    ).rejects.toThrow("Activity 'alphabet-match' domain 'alphabet' does not match observation domain 'numbers'");
  });

  it("handles backend 404 child not found cleanly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Child 'nonexistent' not found" }),
    } as Response);

    await expect(
      api.createObservation({
        childId: "nonexistent",
        domain: "alphabet",
        activityId: "alphabet-match",
        score: 2,
        note: "Testing non-existent child",
      })
    ).rejects.toThrow("Child 'nonexistent' not found");
  });
});
