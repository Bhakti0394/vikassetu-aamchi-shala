import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Calendar,
  Pencil,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Filter,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  ACTIVITIES,
  DOMAINS,
  SCORE_LABEL,
  activityOf,
  domainOf,
  toneBg,
  type DomainId,
  type Score,
  type Child,
  type Observation,
  type Activity,
} from "@/lib/data";
import { Avatar, DomainChip, PageHeader, ScoreBadge } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import * as api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { invalidateRecommendationCache } from "@/lib/aiRecommendations";

type SearchParams = {
  child?: string | undefined;
  domain?: DomainId | undefined;
  activity?: string | undefined;
};

export const Route = createFileRoute("/progress")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    child: typeof s["child"] === "string" ? s["child"] : undefined,
    domain: DOMAINS.some((d) => d.id === s["domain"]) ? (s["domain"] as DomainId) : undefined,
    activity: typeof s["activity"] === "string" ? s["activity"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Record Progress — VikasSetu" },
      {
        name: "description",
        content: "Record a 1–3 observation in a few taps and update each child's progress.",
      },
      { property: "og:title", content: "Record Progress — VikasSetu" },
      {
        property: "og:description",
        content: "Record a 1–3 observation in a few taps and update each child's progress.",
      },
    ],
  }),
  component: ProgressPage,
});

const SCORE_STYLE: Record<Score, string> = {
  1: "border-coral bg-coral-soft text-coral",
  2: "border-sun bg-sun-soft text-foreground",
  3: "border-primary bg-primary-soft text-primary",
};
const SCORE_EMOJI: Record<Score, string> = { 1: "🌱", 2: "🌿", 3: "🌳" };

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

function ProgressPage() {
  const search = Route.useSearch();
  const store = useStore();

  // Children and Observations lists loaded from backend
  const [childrenList, setChildrenList] = useState<Child[]>(store.children);
  const [observationsList, setObservationsList] = useState<Observation[]>(store.observations);
  const [activitiesList, setActivitiesList] = useState<Activity[]>(ACTIVITIES);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [isLoadingObservations, setIsLoadingObservations] = useState(false);

  // Form State
  const [childId, setChildId] = useState<string | undefined>(search.child);
  const [observationDate, setObservationDate] = useState<string>(todayDateString());
  const [domain, setDomain] = useState<DomainId | undefined>(search.domain);
  const [activityId, setActivityId] = useState<string | undefined>(search.activity);
  const [activityDomainFilter, setActivityDomainFilter] = useState<DomainId | "all">(
    search.domain ?? "all"
  );
  const [score, setScore] = useState<Score | undefined>();
  const [note, setNote] = useState("");

interface FormErrors {
  child?: string | undefined;
  date?: string | undefined;
  domain?: string | undefined;
  activity?: string | undefined;
  score?: string | undefined;
  note?: string | undefined;
}

  // Validation & Submission States
  const [errors, setErrors] = useState<FormErrors>({});
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Success view state
  const [saved, setSaved] = useState<{
    child: Child;
    prevScore?: Score | undefined;
    newScore: Score;
    domain: DomainId;
    note: string;
  } | null>(null);

  // Filter state for Saved Observations
  const [filterChild, setFilterChild] = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [includeBaseline, setIncludeBaseline] = useState<boolean>(false);

  // Edit Modal State
  const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
  const [editDomain, setEditDomain] = useState<DomainId>("alphabet");
  const [editActivityId, setEditActivityId] = useState<string>("");
  const [editScore, setEditScore] = useState<Score>(1);
  const [editNote, setEditNote] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete Confirmation State
  const [deletingObservation, setDeletingObservation] = useState<Observation | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // 1. Fetch children on mount
  const loadChildren = async () => {
    setIsLoadingChildren(true);
    try {
      const data = await api.fetchChildren();
      setChildrenList(data);
      store.setChildren(data);
    } catch (err: unknown) {
      console.warn("Could not fetch children from backend, using store fallback:", err);
    } finally {
      setIsLoadingChildren(false);
    }
  };

  // 2. Fetch observations on mount or filter change
  const loadObservations = async () => {
    setIsLoadingObservations(true);
    try {
      const data = await api.fetchObservations({
        childId: filterChild !== "all" ? filterChild : undefined,
        includeBaseline,
      });
      setObservationsList(data);
      store.setObservations(data);
    } catch (err: unknown) {
      console.warn("Could not fetch observations from backend, using store fallback:", err);
    } finally {
      setIsLoadingObservations(false);
    }
  };

  // 3. Fetch activities on mount
  const loadActivities = async () => {
    try {
      const data = await api.fetchActivities();
      if (Array.isArray(data) && data.length > 0) {
        setActivitiesList(data);
      }
    } catch {
      // Fallback to static ACTIVITIES from data.ts
    }
  };

  useEffect(() => {
    loadChildren();
    loadActivities();
  }, []);

  useEffect(() => {
    loadObservations();
  }, [filterChild, includeBaseline]);

  // Sync route query parameters
  useEffect(() => {
    setSaved(null);
    setChildId(search.child);
    setDomain(search.domain);
    setActivityId(search.activity);
    if (search.domain) {
      setActivityDomainFilter(search.domain);
    } else if (search.activity) {
      const act = activitiesList.find((a) => a.id === search.activity) || activityOf(search.activity);
      if (act) {
        setDomain(act.domain);
        setActivityDomainFilter(act.domain);
      }
    } else {
      setActivityDomainFilter("all");
    }
    setScore(undefined);
    setNote("");
    setErrors({});
    setBackendError(null);
  }, [search.child, search.domain, search.activity, activitiesList]);

  const selectedChild = useMemo(() => {
    return childrenList.find((c) => c.id === childId);
  }, [childrenList, childId]);

  const filteredActivities = useMemo(() => {
    if (activityDomainFilter === "all") return activitiesList;
    return activitiesList.filter((a) => a.domain === activityDomainFilter);
  }, [activitiesList, activityDomainFilter]);

  const currentDomainActivities = useMemo(() => {
    if (!domain) return activitiesList;
    return activitiesList.filter((a) => a.domain === domain);
  }, [activitiesList, domain]);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!childId) {
      newErrors.child = "Please select a child.";
    }

    if (!observationDate || !observationDate.trim()) {
      newErrors.date = "Observation date is required.";
    } else {
      const parsed = new Date(observationDate);
      if (isNaN(parsed.getTime())) {
        newErrors.date = "Please enter a valid date (YYYY-MM-DD).";
      }
    }

    if (!domain) {
      newErrors.domain = "Please select a learning area (category).";
    }

    if (!activityId) {
      newErrors.activity = "Please select an activity.";
    }

    if (!score || ![1, 2, 3].includes(score)) {
      newErrors.score = "Please select a rating/score (1–3).";
    }

    if (!note || !note.trim()) {
      newErrors.note = "Observation notes are required. Please describe the child's response or behavior.";
    } else if (note.trim().length > 500) {
      newErrors.note = `Notes are too long (${note.trim().length}/500 characters).`;
    }

    setErrors(newErrors);
    return !(
      newErrors.child ||
      newErrors.date ||
      newErrors.domain ||
      newErrors.activity ||
      newErrors.score ||
      newErrors.note
    );
  };

  // Submit Handler
  const handleSaveObservation = async () => {
    setBackendError(null);
    if (!validateForm()) return;
    if (!selectedChild || !domain || !activityId || !score) return;

    setIsSubmitting(true);
    const prevScore = selectedChild.scores[domain];

    try {
      const payload: api.CreateObservationPayload = {
        childId: selectedChild.id,
        domain,
        activityId,
        score,
        note: note.trim(),
        date: observationDate,
      };

      const savedObs = await api.createObservation(payload);

      // Re-fetch child profile to keep scores & strengths/needs in sync
      const updatedChild = await api.fetchChild(selectedChild.id);
      store.syncChild(updatedChild);
      store.syncObservation(savedObs);
      invalidateRecommendationCache(updatedChild.id);

      setChildrenList((prev) =>
        prev.map((c) => (c.id === updatedChild.id ? updatedChild : c))
      );

      await loadObservations();

      setSaved({
        child: updatedChild,
        prevScore,
        newScore: score,
        domain,
        note: note.trim(),
      });

      showToast("success", `Observation recorded for ${updatedChild.name}!`);
    } catch (err: unknown) {
      console.error("Failed to create observation:", err);
      const msg = err instanceof Error ? err.message : "Failed to save observation. Please check the backend connection.";
      setBackendError(msg);
      showToast("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to record another observation
  const handleRecordAnother = () => {
    setSaved(null);
    setChildId(undefined);
    setObservationDate(todayDateString());
    setDomain(undefined);
    setActivityId(undefined);
    setActivityDomainFilter("all");
    setScore(undefined);
    setNote("");
    setErrors({});
    setBackendError(null);
  };

  // Open Edit Dialog
  const handleOpenEdit = (obs: Observation) => {
    setEditingObservation(obs);
    setEditDomain(obs.domain);
    setEditActivityId(obs.activityId);
    setEditScore(obs.score);
    setEditNote(obs.note);
    setEditError(null);
  };

  // Available activities in Edit modal based on selected editDomain
  const editDomainActivities = useMemo(() => {
    return activitiesList.filter((a) => a.domain === editDomain);
  }, [activitiesList, editDomain]);

  // Handle Edit Submission
  const handleSaveEdit = async () => {
    if (!editingObservation) return;
    setEditError(null);

    if (!editDomain) {
      setEditError("Learning area is required.");
      return;
    }
    if (!editActivityId) {
      setEditError("Please select an activity.");
      return;
    }
    if (!editScore) {
      setEditError("Please select a score.");
      return;
    }
    if (!editNote || !editNote.trim()) {
      setEditError("Observation notes cannot be empty.");
      return;
    }
    if (editNote.trim().length > 500) {
      setEditError("Notes cannot exceed 500 characters.");
      return;
    }

    setIsEditSubmitting(true);
    try {
      const updated = await api.updateObservation(editingObservation.id, {
        domain: editDomain,
        activityId: editActivityId,
        score: editScore,
        note: editNote.trim(),
      });

      // Synchronize child profile to reflect new derived scores
      const updatedChild = await api.fetchChild(editingObservation.childId);
      store.syncChild(updatedChild);
      store.syncObservation(updated);
      invalidateRecommendationCache(updatedChild.id);

      setChildrenList((prev) =>
        prev.map((c) => (c.id === updatedChild.id ? updatedChild : c))
      );

      await loadObservations();
      setEditingObservation(null);
      showToast("success", "Observation updated successfully.");
    } catch (err: unknown) {
      console.error("Failed to update observation:", err);
      const msg = err instanceof Error ? err.message : "Failed to update observation.";
      setEditError(msg);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingObservation) return;
    setDeleteError(null);
    setIsDeleteSubmitting(true);

    try {
      await api.deleteObservation(deletingObservation.id);

      // Re-fetch child profile to update scores
      const updatedChild = await api.fetchChild(deletingObservation.childId);
      store.syncChild(updatedChild);
      store.removeObservationFromStore(deletingObservation.id);
      invalidateRecommendationCache(updatedChild.id);

      setChildrenList((prev) =>
        prev.map((c) => (c.id === updatedChild.id ? updatedChild : c))
      );

      await loadObservations();
      setDeletingObservation(null);
      showToast("success", "Observation removed and child progress updated.");
    } catch (err: unknown) {
      console.error("Failed to delete observation:", err);
      const msg = err instanceof Error ? err.message : "Failed to delete observation.";
      setDeleteError(msg);
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  // Filtered observations for the list
  const filteredObservations = useMemo(() => {
    return observationsList.filter((o) => {
      if (filterChild !== "all" && o.childId !== filterChild) return false;
      if (filterDomain !== "all" && o.domain !== filterDomain) return false;
      return true;
    });
  }, [observationsList, filterChild, filterDomain]);

  // If saved, render the success banner
  if (saved) {
    return (
      <div className="fade-up mx-auto max-w-lg py-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
          <CheckCircle2 className="h-11 w-11 text-primary" />
        </div>
        <h1 className="mt-5 text-3xl font-bold">Observation recorded successfully.</h1>
        <p className="mt-2 text-muted-foreground">{saved.child.name}'s progress has been updated in the database.</p>
        <div className="card-soft mt-6 flex items-center justify-center gap-4 p-5">
          <Avatar child={saved.child} />
          <div className="text-left">
            <p className="font-bold">{domainOf(saved.domain)?.name ?? saved.domain}</p>
            <p className="text-sm text-muted-foreground">
              Level {saved.prevScore ?? 1} →{" "}
              <span className="font-bold text-primary">Level {saved.newScore}</span>
            </p>
            {saved.note && (
              <p className="mt-1 text-xs italic text-muted-foreground max-w-xs truncate">
                "{saved.note}"
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/children/$id" params={{ id: saved.child.id }} className="btn btn-primary">
            View {saved.child.name}'s profile
          </Link>
          <button onClick={handleRecordAnother} className="btn btn-ghost">
            Record another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up space-y-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl p-4 shadow-lift transition",
            toast.type === "success"
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 rounded-full p-1 hover:bg-black/10"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        eyebrow="Observation Management"
        title="Record an Observation"
        subtitle="Capture learning moments, rate progress from 1 to 3, and save directly to VikasSetu's records."
      />

      {/* Backend Error Banner */}
      {backendError && (
        <div className="card-soft border-2 border-coral bg-coral-soft p-4 text-coral flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error saving observation</p>
            <p className="text-sm">{backendError}</p>
          </div>
          <button
            onClick={() => setBackendError(null)}
            className="text-coral hover:opacity-80"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Form Card */}
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Step 1: Select Child */}
        <Step
          n={1}
          title="Select child"
          done={!!selectedChild}
          error={errors.child}
        >
          {isLoadingChildren ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading children from records...</span>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {childrenList.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setChildId(c.id);
                      if (errors.child) setErrors((prev) => ({ ...prev, child: undefined }));
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition focus:outline-none focus:ring-2 focus:ring-primary",
                      childId === c.id
                        ? "border-primary bg-primary-soft shadow-soft"
                        : "border-transparent hover:bg-muted"
                    )}
                  >
                    <Avatar child={c} size="sm" />
                    <span className="text-sm font-bold truncate max-w-full">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.age} yrs</span>
                  </button>
                ))}
              </div>

              {/* Accessible Dropdown Fallback / Alternative */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Or select from dropdown:</span>
                <select
                  value={childId || ""}
                  onChange={(e) => {
                    setChildId(e.target.value || undefined);
                    if (errors.child) setErrors((prev) => ({ ...prev, child: undefined }));
                  }}
                  className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Choose child --</option>
                  {childrenList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.age} years)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </Step>

        {/* Step 2: Observation Date */}
        <Step
          n={2}
          title="Observation date"
          done={!!observationDate && !errors.date}
          error={errors.date}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={observationDate}
                max={todayDateString()}
                onChange={(e) => {
                  setObservationDate(e.target.value);
                  if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setObservationDate(todayDateString());
                if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              className="btn btn-ghost text-xs px-3 py-2"
            >
              Today
            </button>
            <span className="text-xs text-muted-foreground">
              Date the activity or behavior was observed in class.
            </span>
          </div>
        </Step>

        {/* Step 3: Select Learning Area (Category) */}
        <Step
          n={3}
          title="Select learning area (category)"
          done={!!domain}
          error={errors.domain}
          disabled={!selectedChild}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setActivityDomainFilter("all");
              }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary",
                activityDomainFilter === "all" && !domain
                  ? "border-primary bg-primary-soft shadow-soft"
                  : "border-transparent bg-muted/60 hover:bg-muted"
              )}
            >
              <span className="text-2xl">✨</span>
              <div className="flex-1 min-w-0">
                <span className="font-bold block">All Learning Areas</span>
                <span className="text-xs text-muted-foreground">All {activitiesList.length} activities</span>
              </div>
            </button>
            {DOMAINS.map((d) => {
              const dCount = activitiesList.filter((a) => a.domain === d.id).length;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDomain(d.id);
                    setActivityDomainFilter(d.id);
                    if (activityId) {
                      const act = activitiesList.find((a) => a.id === activityId);
                      if (act && act.domain !== d.id) {
                        setActivityId(undefined);
                      }
                    }
                    if (errors.domain) setErrors((prev) => ({ ...prev, domain: undefined }));
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary",
                    domain === d.id
                      ? "border-primary bg-primary-soft shadow-soft"
                      : "border-transparent " + toneBg[d.tone]
                  )}
                >
                  <span className="text-2xl">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{d.name}</span>
                      <span className="text-[11px] opacity-70 font-semibold">({dCount})</span>
                    </div>
                    {selectedChild && (
                      <span className="text-xs font-bold text-muted-foreground block">
                        current {selectedChild.scores[d.id]}/3
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Step>

        {/* Step 4: Select Activity */}
        <Step
          n={4}
          title={
            activityDomainFilter === "all"
              ? `Select activity (All ${activitiesList.length} activities available)`
              : `Select activity (${filteredActivities.length} available in ${domainOf(activityDomainFilter)?.short})`
          }
          done={!!activityId}
          error={errors.activity}
          disabled={!selectedChild}
        >
          <div className="space-y-4">
            {/* Filter pills to quickly switch domains or see all 21 */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border/50">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Filter area:</span>
              <button
                type="button"
                onClick={() => setActivityDomainFilter("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer",
                  activityDomainFilter === "all"
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                All ({activitiesList.length})
              </button>
              {DOMAINS.map((d) => {
                const count = activitiesList.filter((a) => a.domain === d.id).length;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setActivityDomainFilter(d.id);
                      setDomain(d.id);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer",
                      activityDomainFilter === d.id
                        ? "bg-foreground text-background shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{d.emoji}</span>
                    <span>{d.short}</span>
                    <span className="opacity-70 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Activities list */}
            {activityDomainFilter === "all" ? (
              <div className="space-y-4">
                {DOMAINS.map((d) => {
                  const domainActs = activitiesList.filter((a) => a.domain === d.id);
                  if (domainActs.length === 0) return null;
                  return (
                    <div key={d.id} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pt-1">
                        <span>{d.emoji}</span>
                        <span>{d.name}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                          {domainActs.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {domainActs.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            data-testid={`activity-btn-${a.id}`}
                            onClick={() => {
                              setActivityId(a.id);
                              setDomain(a.domain);
                              if (errors.activity || errors.domain) {
                                setErrors((prev) => ({ ...prev, activity: undefined, domain: undefined }));
                              }
                            }}
                            className={cn(
                              "flex items-center gap-2 rounded-xl border-2 px-3.5 py-2 font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm cursor-pointer",
                              activityId === a.id
                                ? "border-primary bg-primary-soft text-primary shadow-soft"
                                : "border-border bg-card hover:bg-muted hover:border-muted-foreground/30"
                            )}
                          >
                            <span className="text-base sm:text-lg">{a.emoji}</span>
                            <span>{a.name}</span>
                            <span className="text-[11px] opacity-60 font-normal">
                              ({a.minutes}m · {a.difficulty})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {filteredActivities.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      data-testid={`activity-btn-${a.id}`}
                      onClick={() => {
                        setActivityId(a.id);
                        setDomain(a.domain);
                        if (errors.activity || errors.domain) {
                          setErrors((prev) => ({ ...prev, activity: undefined, domain: undefined }));
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border-2 px-3.5 py-2 font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm cursor-pointer",
                        activityId === a.id
                          ? "border-primary bg-primary-soft text-primary shadow-soft"
                          : "border-border bg-card hover:bg-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <span className="text-base sm:text-lg">{a.emoji}</span>
                      <span>{a.name}</span>
                      <span className="text-[11px] opacity-60 font-normal">
                        ({a.minutes}m · {a.difficulty})
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>
                    Showing {filteredActivities.length} of {activitiesList.length} activities for {domainOf(activityDomainFilter)?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivityDomainFilter("all")}
                    className="btn btn-ghost text-xs py-1 px-2 font-bold text-primary hover:underline cursor-pointer"
                  >
                    View all {activitiesList.length} activities →
                  </button>
                </div>
              </div>
            )}
          </div>
        </Step>

        {/* Step 5: Give a Score / Rating */}
        <Step
          n={5}
          title="Give a score / rating"
          done={!!score}
          error={errors.score}
          disabled={!activityId}
        >
          <div className="grid grid-cols-3 gap-3">
            {([1, 2, 3] as Score[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setScore(s);
                  if (errors.score) setErrors((prev) => ({ ...prev, score: undefined }));
                }}
                className={cn(
                  "rounded-2xl border-2 p-4 text-center transition focus:outline-none focus:ring-2 focus:ring-primary",
                  score === s
                    ? SCORE_STYLE[s] + " shadow-soft scale-102"
                    : "border-border hover:bg-muted"
                )}
              >
                <div className="text-3xl">{SCORE_EMOJI[s]}</div>
                <div className="font-display text-2xl font-bold">{s}</div>
                <div className="text-sm font-bold">{SCORE_LABEL[s]}</div>
              </button>
            ))}
          </div>
        </Step>

        {/* Step 6: Notes (Required) */}
        <Step
          n={6}
          title="Observation notes (required)"
          done={!!note.trim()}
          error={errors.note}
          disabled={!score}
        >
          <div className="space-y-2">
            <textarea
              value={note}
              maxLength={500}
              onChange={(e) => {
                setNote(e.target.value);
                if (errors.note) setErrors((prev) => ({ ...prev, note: undefined }));
              }}
              rows={3}
              placeholder="e.g. Recognised A, B and C easily, but needed gentle prompting to match D and E."
              className={cn(
                "w-full rounded-2xl border bg-background p-4 outline-none focus:ring-2 focus:ring-primary transition",
                errors.note ? "border-coral ring-coral" : "border-border"
              )}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
              <span>Specific details help understand what support or practice the child needs.</span>
              <span className={cn(note.length > 450 && "text-coral font-bold")}>
                {note.length} / 500
              </span>
            </div>
          </div>
        </Step>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveObservation}
            className={cn(
              "btn btn-primary w-full py-4 text-lg font-bold shadow-lift flex items-center justify-center gap-2",
              isSubmitting && "opacity-75 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Saving Observation to Database...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Save Observation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Saved Observations Section */}
      <section className="pt-8 border-t">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Saved Observations</h2>
            <p className="text-sm text-muted-foreground">
              Review, edit, or remove past classroom observations stored in VikasSetu.
            </p>
          </div>

          <button
            type="button"
            onClick={loadObservations}
            disabled={isLoadingObservations}
            className="btn btn-ghost text-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingObservations && "animate-spin")} />
            <span>Refresh records</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="card-soft mb-6 p-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Filters:</span>
          </div>

          {/* Child filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-child" className="text-xs text-muted-foreground">Child:</label>
            <select
              id="filter-child"
              value={filterChild}
              onChange={(e) => setFilterChild(e.target.value)}
              className="rounded-lg border bg-background px-2.5 py-1 text-sm font-medium"
            >
              <option value="all">All Children</option>
              {childrenList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Domain filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-domain" className="text-xs text-muted-foreground">Area:</label>
            <select
              id="filter-domain"
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="rounded-lg border bg-background px-2.5 py-1 text-sm font-medium"
            >
              <option value="all">All Learning Areas</option>
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.emoji} {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Baseline toggle */}
          <label className="flex items-center gap-2 cursor-pointer ml-auto text-xs font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={includeBaseline}
              onChange={(e) => setIncludeBaseline(e.target.checked)}
              className="rounded border-muted text-primary focus:ring-primary"
            />
            <span>Include baseline records ({observationsList.length})</span>
          </label>
        </div>

        {/* Observations List */}
        {isLoadingObservations ? (
          <div className="card-soft flex items-center justify-center p-12 text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading saved observations...</span>
          </div>
        ) : filteredObservations.length === 0 ? (
          <div className="card-soft p-10 text-center text-muted-foreground">
            <p className="font-bold text-base">No observations found</p>
            <p className="text-sm mt-1">
              {filterChild !== "all" || filterDomain !== "all"
                ? "Try clearing your filters or recording a new observation above."
                : "No observations have been recorded yet. Use the form above to record one."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3 stagger">
            {filteredObservations.map((o) => {
              const c = childrenList.find((x) => x.id === o.childId);
              const activity = activitiesList.find((a) => a.id === o.activityId) || activityOf(o.activityId);

              return (
                <li
                  key={o.id}
                  className="card-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 transition hover:shadow-soft"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {c ? (
                      <Link to="/children/$id" params={{ id: c.id }} className="shrink-0 hover:opacity-85">
                        <Avatar child={c} size="sm" />
                      </Link>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        🧒🏽
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {c ? (
                          <Link
                            to="/children/$id"
                            params={{ id: c.id }}
                            className="font-bold hover:underline"
                          >
                            {c.name}
                          </Link>
                        ) : (
                          <span className="font-bold text-muted-foreground">{o.childId}</span>
                        )}
                        <DomainChip id={o.domain} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(o.date)}
                        </span>
                        {o.isBaseline && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                            Baseline
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-foreground/90">
                        <span className="font-medium text-foreground">
                          {activity?.name || o.activityId}
                        </span>
                        {o.note && (
                          <span className="text-muted-foreground"> — "{o.note}"</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <ScoreBadge score={o.score} />
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(o)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      title="Edit observation"
                      aria-label="Edit observation"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingObservation(o)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                      title="Delete observation"
                      aria-label="Delete observation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Edit Observation Modal */}
      <Dialog
        open={!!editingObservation}
        onOpenChange={(open) => {
          if (!open) {
            setEditingObservation(null);
            setEditError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Observation</DialogTitle>
            <DialogDescription>
              Update the domain, activity, score, or notes for this record. Child scores will be automatically recalculated.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Domain Selector */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Learning Area
              </label>
              <select
                value={editDomain}
                onChange={(e) => {
                  const newD = e.target.value as DomainId;
                  setEditDomain(newD);
                  const matching = activitiesList.filter((a) => a.domain === newD);
                  if (matching[0]) setEditActivityId(matching[0].id);
                }}
                className="w-full rounded-lg border bg-background p-2.5 text-sm font-medium"
              >
                {DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.emoji} {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity Selector */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Activity ({activitiesList.length} total available)
              </label>
              <select
                value={editActivityId}
                onChange={(e) => {
                  const newActId = e.target.value;
                  setEditActivityId(newActId);
                  const act = activitiesList.find((a) => a.id === newActId);
                  if (act && act.domain !== editDomain) {
                    setEditDomain(act.domain);
                  }
                }}
                className="w-full rounded-lg border bg-background p-2.5 text-sm font-medium"
              >
                {DOMAINS.map((d) => {
                  const acts = activitiesList.filter((a) => a.domain === d.id);
                  if (acts.length === 0) return null;
                  return (
                    <optgroup key={d.id} label={`${d.emoji} ${d.name} (${acts.length})`}>
                      {acts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.emoji} {a.name} ({a.difficulty} · {a.minutes}m)
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Score Selector */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Score / Rating
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as Score[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditScore(s)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center font-bold text-sm transition",
                      editScore === s ? SCORE_STYLE[s] : "border-border hover:bg-muted"
                    )}
                  >
                    <div>{SCORE_EMOJI[s]} {s}</div>
                    <div className="text-xs font-semibold">{SCORE_LABEL[s]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                Observation Notes
              </label>
              <textarea
                value={editNote}
                maxLength={500}
                onChange={(e) => setEditNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="Observation notes..."
              />
              <div className="text-right text-xs text-muted-foreground mt-1">
                {editNote.length} / 500
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setEditingObservation(null)}
              className="btn btn-ghost"
              disabled={isEditSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isEditSubmitting}
              className="btn btn-primary inline-flex items-center gap-1.5"
            >
              {isEditSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!deletingObservation}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingObservation(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Observation?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this observation? The child's progress scores and strengths/needs will be recalculated automatically.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <button
              type="button"
              onClick={() => setDeletingObservation(null)}
              className="btn btn-ghost"
              disabled={isDeleteSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleteSubmitting}
              className="btn btn-coral inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleteSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Delete Observation</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Step({
  n,
  title,
  done,
  disabled,
  error,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  disabled?: boolean | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "card-soft p-5 transition",
        disabled && "pointer-events-none opacity-45",
        error && "border-2 border-coral ring-1 ring-coral/40"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition",
              done
                ? "bg-primary text-primary-foreground"
                : error
                  ? "bg-coral text-white"
                  : "bg-muted"
            )}
          >
            {done ? "✓" : n}
          </span>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
      </div>
      {children}
      {error && (
        <p className="mt-2 text-xs font-bold text-coral flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </section>
  );
}
