import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Check,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Pencil,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Filter,
  ArrowRight,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  ACTIVITIES,
  DOMAINS,
  SCORE_LABEL,
  activityOf,
  domainOf,
  type DomainId,
  type Score,
  type Child,
  type Observation,
  type Activity,
} from "@/lib/data";
import { DomainChip, ScoreBadge } from "@/components/ui-kit";
import { ChildAvatar } from "@/components/ChildAvatar";
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
      { title: "Record an Observation — VikasSetu" },
      {
        name: "description",
        content: "Record a 1–3 observation in a few taps and update each child's progress.",
      },
      { property: "og:title", content: "Record an Observation — VikasSetu" },
      {
        property: "og:description",
        content: "Record a 1–3 observation in a few taps and update each child's progress.",
      },
    ],
  }),
  component: ProgressPage,
});

const SCORE_EMOJI: Record<Score, string> = { 1: "🌱", 2: "🌿", 3: "🌳" };

const RATING_HINTS: Record<Score, string> = {
  1: "Needs guidance & practice",
  2: "Demonstrates with some help",
  3: "Confident and independent",
};

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

interface FormErrors {
  child?: string | undefined;
  date?: string | undefined;
  domain?: string | undefined;
  activity?: string | undefined;
  score?: string | undefined;
  note?: string | undefined;
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

  // Step expansion state: null means auto-managed (completed collapse, active step expands)
  // or a step number 1-6 if user explicitly clicked "Edit"
  const [editingStep, setEditingStep] = useState<number | null>(null);

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

  const selectedActivity = useMemo(() => {
    return activitiesList.find((a) => a.id === activityId) || (activityId ? activityOf(activityId) : undefined);
  }, [activitiesList, activityId]);

  const filteredActivities = useMemo(() => {
    if (activityDomainFilter === "all") return activitiesList;
    return activitiesList.filter((a) => a.domain === activityDomainFilter);
  }, [activitiesList, activityDomainFilter]);

  // Current active step calculation
  const currentStep = useMemo(() => {
    if (!selectedChild) return 1;
    if (!observationDate || !!errors.date) return 2;
    if (!domain) return 3;
    if (!activityId) return 4;
    if (!score) return 5;
    return 6;
  }, [selectedChild, observationDate, errors.date, domain, activityId, score]);

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
    setEditingStep(null);
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
      setEditError("Activity is required.");
      return;
    }

    if (!editScore || ![1, 2, 3].includes(editScore)) {
      setEditError("Score must be between 1 and 3.");
      return;
    }

    if (editNote.trim().length > 500) {
      setEditError("Notes cannot exceed 500 characters.");
      return;
    }

    setIsEditSubmitting(true);
    try {
      const updatedObs = await api.updateObservation(editingObservation.id, {
        domain: editDomain,
        activityId: editActivityId,
        score: editScore,
        note: editNote.trim(),
      });

      // Update in store and re-fetch child profile to update scores
      store.syncObservation(updatedObs);
      const updatedChild = await api.fetchChild(updatedObs.childId);
      store.syncChild(updatedChild);
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

  // Confirm Observation Deletion
  const handleConfirmDelete = async () => {
    if (!deletingObservation) return;
    setIsDeleteSubmitting(true);
    setDeleteError(null);

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

  // Helper to check whether a step should be expanded
  const isStepExpanded = (stepNum: number, isDone: boolean, hasError: boolean) => {
    if (hasError) return true;
    if (editingStep === stepNum) return true;
    if (editingStep !== null) return false;
    // Auto-managed mode: current step expands, completed collapse
    return currentStep === stepNum || !isDone;
  };

  // Activity card rendering helper for Step 4
  const renderActivityCard = (a: Activity) => {
    const isSelected = activityId === a.id;
    return (
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
          if (editingStep === 4) setEditingStep(null);
        }}
        className={cn(
          "flex items-center justify-between gap-3 rounded-[12px] p-3.5 text-left transition-colors duration-150 cursor-pointer min-h-[52px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32]",
          isSelected
            ? "bg-[#DCE9DD] border-2 border-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
            : "bg-[#FFFDF8] border border-[#E2D9C8] hover:bg-[#F4EFE3] hover:border-[#D8CEBD]"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F4EFE3] border border-[#E2D9C8] text-xl">
            {a.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-[#26332D] truncate leading-snug">
              {a.name}
            </span>
            <span className="block text-[13px] text-[#5F6B62]">
              {a.minutes} min · {a.difficulty}
            </span>
          </div>
        </div>
        {isSelected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#193F32] text-white">
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
          </span>
        )}
      </button>
    );
  };

  // If saved, render the success banner matching Recommendations palette
  if (saved) {
    return (
      <div className="fade-up mx-auto max-w-xl py-12 text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#DCE9DD]">
          <Check className="h-7 w-7 text-[#193F32] stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#193F32]">
            Observation recorded.
          </h1>
          <p className="text-[14px] text-[#5F6B62]">
            {saved.child.name}'s progress has been saved.
          </p>
        </div>

        <div className="rounded-[16px] border border-[#E2D9C8] bg-[#F4EFE3] p-6 text-left space-y-4 shadow-[0_1px_2px_rgba(25,63,50,0.06)]">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2D9C8]">
            <ChildAvatar child={saved.child} size="card" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[16px] text-[#26332D] leading-tight">{saved.child.name}</p>
              <p className="text-[12px] text-[#5F6B62]">{saved.child.age} years old</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[#193F32] bg-[#DCE9DD] px-2.5 py-1 rounded-[8px]">
                {domainOf(saved.domain)?.name ?? saved.domain}
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-sm mb-1.5">
              <span className="text-[12px] font-bold text-[#5F6B62] uppercase tracking-wide">
                Progress Level
              </span>
              <span className="font-bold text-[#193F32] text-sm">
                Level {saved.prevScore ?? 1} → Level {saved.newScore}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E2D9C8] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#193F32] transition-all duration-300"
                style={{ width: `${(saved.newScore / 3) * 100}%` }}
              />
            </div>
          </div>

          {saved.note && (
            <div className="pt-2 border-t border-[#E2D9C8]">
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#5F6B62] mb-1">
                Your note
              </p>
              <p className="text-[14px] text-[#26332D] leading-relaxed">
                "{saved.note}"
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link
            to="/children/$id"
            params={{ id: saved.child.id }}
            className="rounded-[12px] bg-[#193F32] hover:bg-[#193F32]/90 text-white font-bold h-[48px] px-6 inline-flex items-center justify-center transition-colors shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
          >
            View {saved.child.name}'s profile
          </Link>
          <button
            type="button"
            onClick={handleRecordAnother}
            className="rounded-[12px] border border-[#E2D9C8] bg-[#FFFDF8] hover:bg-[#F4EFE3] text-[#193F32] font-bold h-[48px] px-6 inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            Record another
          </button>
        </div>

        <div className="pt-2">
          <Link
            to="/recommendations"
            search={{ child: saved.child.id }}
            className="text-[14px] font-semibold text-[#193F32] hover:underline inline-flex items-center gap-1"
          >
            <span>See recommendations for {saved.child.name}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up w-full space-y-10">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[12px] px-4 py-3 shadow-[0_4px_12px_rgba(25,63,50,0.15)] transition-all",
            toast.type === "success"
              ? "bg-[#193F32] text-white"
              : "bg-[#DF806B] text-white"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#DCE9DD]" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 rounded-full p-1 hover:bg-black/10 cursor-pointer"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <header className="space-y-1 pt-1 pb-1">
        <p className="text-[12px] font-bold uppercase tracking-wider text-[#193F32]">
          Observation Management
        </p>
        <h1 className="font-display text-[28px] sm:text-[32px] font-bold tracking-tight text-[#193F32] leading-tight">
          Record an Observation
        </h1>
        <p className="text-[14px] text-[#5F6B62] leading-relaxed max-w-[60ch]">
          Capture learning moments, rate progress from 1 to 3, and save directly to VikasSetu's records.
        </p>
      </header>

      {/* Backend Error Banner */}
      {backendError && (
        <div className="rounded-[14px] border border-[#DF806B] bg-[#DF806B]/10 p-4 text-[#DF806B] flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error saving observation</p>
            <p className="text-sm">{backendError}</p>
          </div>
          <button
            onClick={() => setBackendError(null)}
            className="text-[#DF806B] hover:opacity-80 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Two-Column Layout on Desktop / Single Column on Mobile */}
      <div className="flex flex-col xl:flex-row xl:items-start gap-8">
        {/* Left Column (about 65% on desktop): Form Steps */}
        <div className="w-full xl:w-[65%] xl:flex-1 space-y-6">
          {/* Step 1: Select Child */}
          <Step
            n={1}
            title="Select child"
            done={!!selectedChild}
            error={errors.child}
            isExpanded={isStepExpanded(1, !!selectedChild, !!errors.child)}
            summaryText={
              selectedChild ? (
                <span className="font-bold text-[#26332D]">
                  {selectedChild.name} ({selectedChild.age} yrs)
                </span>
              ) : undefined
            }
            onToggleExpand={() => setEditingStep(editingStep === 1 ? null : 1)}
          >
            {isLoadingChildren ? (
              <div className="flex items-center justify-center p-6 text-[#5F6B62] gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#193F32]" />
                <span>Loading children from records...</span>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {childrenList.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setChildId(c.id);
                        if (errors.child) setErrors((prev) => ({ ...prev, child: undefined }));
                        if (editingStep === 1) setEditingStep(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-[12px] p-3 text-center transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] cursor-pointer min-h-[44px]",
                        childId === c.id
                          ? "bg-[#DCE9DD] border-2 border-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                          : "bg-[#FFFDF8] border border-[#E2D9C8] hover:border-[#193F32]/50 hover:bg-[#F4EFE3]"
                      )}
                    >
                      <ChildAvatar child={c} size="lg" />
                      <span className="text-[14px] font-bold text-[#26332D] truncate max-w-full leading-tight">
                        {c.name}
                      </span>
                      <span className="text-[12px] text-[#5F6B62]">
                        {c.age} yrs
                      </span>
                    </button>
                  ))}
                </div>

                {/* Mobile Dropdown Fallback only */}
                <div className="mt-3 block sm:hidden">
                  <label htmlFor="mobile-child-select" className="text-xs text-[#5F6B62] font-semibold block mb-1">
                    Or select from dropdown:
                  </label>
                  <select
                    id="mobile-child-select"
                    value={childId || ""}
                    onChange={(e) => {
                      setChildId(e.target.value || undefined);
                      if (errors.child) setErrors((prev) => ({ ...prev, child: undefined }));
                    }}
                    className="w-full rounded-[10px] border border-[#E2D9C8] bg-[#FFFDF8] px-3 py-2 text-sm text-[#26332D] focus:outline-none focus:ring-2 focus:ring-[#193F32]"
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
            disabled={!selectedChild}
            isExpanded={isStepExpanded(2, !!observationDate && !errors.date, !!errors.date)}
            summaryText={
              <span className="font-bold text-[#26332D]">{formatDate(observationDate)}</span>
            }
            onToggleExpand={() => setEditingStep(editingStep === 2 ? null : 2)}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-xs w-full">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5F6B62]" />
                <input
                  type="date"
                  value={observationDate}
                  max={todayDateString()}
                  onChange={(e) => {
                    setObservationDate(e.target.value);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  className="w-full rounded-[10px] border border-[#E2D9C8] bg-[#FFFDF8] py-2 pl-10 pr-3 text-sm font-medium text-[#26332D] outline-none focus:ring-2 focus:ring-[#193F32] focus:border-[#193F32]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setObservationDate(todayDateString());
                  if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                  if (editingStep === 2) setEditingStep(null);
                }}
                className="rounded-[10px] bg-[#F4EFE3] hover:bg-[#E2D9C8] text-[#193F32] border border-[#E2D9C8] px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#193F32]"
              >
                Today
              </button>
              <span className="text-[13px] text-[#5F6B62]">
                Date the activity or behavior was observed in class.
              </span>
            </div>
          </Step>

          {/* Step 3: Select Learning Area (Category) */}
          <Step
            n={3}
            title="Select learning area"
            done={!!domain}
            error={errors.domain}
            disabled={!selectedChild}
            isExpanded={isStepExpanded(3, !!domain, !!errors.domain)}
            summaryText={
              domain ? (
                <span className="font-bold text-[#26332D]">
                  {domainOf(domain)?.emoji} {domainOf(domain)?.name}
                </span>
              ) : undefined
            }
            onToggleExpand={() => setEditingStep(editingStep === 3 ? null : 3)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActivityDomainFilter("all");
                }}
                className={cn(
                  "rounded-[12px] p-3 text-left transition-colors flex items-center gap-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] min-h-[44px]",
                  activityDomainFilter === "all" && !domain
                    ? "bg-[#DCE9DD] border-2 border-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                    : "bg-[#F4EFE3] border border-[#E2D9C8] hover:bg-[#EAE4D7]"
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFFDF8] border border-[#E2D9C8] text-base">
                  ✨
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-[16px] text-[#26332D] block truncate">
                    All Learning Areas
                  </span>
                  <span className="text-[13px] text-[#5F6B62]">
                    All {activitiesList.length} activities
                  </span>
                </div>
              </button>

              {DOMAINS.map((d) => {
                const dCount = activitiesList.filter((a) => a.domain === d.id).length;
                const isSelected = domain === d.id;
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
                      if (editingStep === 3) setEditingStep(null);
                    }}
                    className={cn(
                      "rounded-[12px] p-3 text-left transition-colors flex items-center gap-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32] min-h-[44px]",
                      isSelected
                        ? "bg-[#DCE9DD] border-2 border-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                        : "bg-[#F4EFE3] border border-[#E2D9C8] hover:bg-[#EAE4D7]"
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFFDF8] border border-[#E2D9C8] text-base">
                      {d.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[16px] text-[#26332D] block truncate">
                        {d.name}
                      </span>
                      <div className="flex items-center gap-2 text-[13px] text-[#5F6B62]">
                        {selectedChild ? (
                          <span>current {selectedChild.scores[d.id]}/3</span>
                        ) : (
                          <span>{dCount} activities</span>
                        )}
                      </div>
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
                ? `Select activity (${activitiesList.length} total)`
                : `Select activity (${filteredActivities.length} in ${domainOf(activityDomainFilter)?.short})`
            }
            done={!!activityId}
            error={errors.activity}
            disabled={!selectedChild}
            isExpanded={isStepExpanded(4, !!activityId, !!errors.activity)}
            summaryText={
              selectedActivity ? (
                <span className="font-bold text-[#26332D]">
                  {selectedActivity.emoji} {selectedActivity.name} ({selectedActivity.minutes}m)
                </span>
              ) : undefined
            }
            onToggleExpand={() => setEditingStep(editingStep === 4 ? null : 4)}
          >
            {activityDomainFilter === "all" ? (
              <div className="space-y-5">
                {DOMAINS.map((d) => {
                  const domainActs = activitiesList.filter((a) => a.domain === d.id);
                  if (domainActs.length === 0) return null;
                  return (
                    <div key={d.id} className="space-y-2.5">
                      <div className="flex items-center gap-2 text-[14px] font-semibold text-[#5F6B62]">
                        <span>{d.emoji}</span>
                        <span>{d.name}</span>
                        <span className="text-xs text-[#5F6B62]/80 font-normal">({domainActs.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {domainActs.map((a) => renderActivityCard(a))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredActivities.map((a) => renderActivityCard(a))}
                </div>
                <div className="flex items-center justify-between text-[13px] text-[#5F6B62] pt-1">
                  <span>
                    Showing {filteredActivities.length} of {activitiesList.length} activities for {domainOf(activityDomainFilter)?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivityDomainFilter("all")}
                    className="text-xs font-bold text-[#193F32] hover:underline cursor-pointer"
                  >
                    View all {activitiesList.length} activities →
                  </button>
                </div>
              </div>
            )}
          </Step>

          {/* Step 5: Give a Score / Rating */}
          <Step
            n={5}
            title="Give a score / rating"
            done={!!score}
            error={errors.score}
            disabled={!activityId}
            isExpanded={isStepExpanded(5, !!score, !!errors.score)}
            summaryText={
              score ? (
                <span className="font-bold text-[#193F32]">
                  {SCORE_EMOJI[score]} Level {score} — {SCORE_LABEL[score]}
                </span>
              ) : undefined
            }
            onToggleExpand={() => setEditingStep(editingStep === 5 ? null : 5)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([1, 2, 3] as Score[]).map((s) => {
                const isSelected = score === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setScore(s);
                      if (errors.score) setErrors((prev) => ({ ...prev, score: undefined }));
                      if (editingStep === 5) setEditingStep(null);
                    }}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-[14px] p-4 text-center transition-colors duration-150 cursor-pointer min-h-[88px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32]",
                      isSelected
                        ? "bg-[#DCE9DD] border-2 border-[#193F32] shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                        : "bg-[#FFFDF8] border border-[#E2D9C8] hover:bg-[#F4EFE3] hover:border-[#D8CEBD]"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#193F32] text-white">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </span>
                    )}
                    <div className="text-3xl mb-1">{SCORE_EMOJI[s]}</div>
                    <div className="font-display text-xl font-bold text-[#26332D]">
                      {s} · {SCORE_LABEL[s]}
                    </div>
                    <div className="text-[12px] text-[#5F6B62] mt-1 leading-snug">
                      {RATING_HINTS[s]}
                    </div>
                  </button>
                );
              })}
            </div>
          </Step>

          {/* Step 6: Notes (Required) */}
          <Step
            n={6}
            title="Observation notes (required)"
            done={!!note.trim()}
            error={errors.note}
            disabled={!score}
            isExpanded={isStepExpanded(6, !!note.trim(), !!errors.note)}
            summaryText={
              note.trim() ? (
                <span className="italic text-[#26332D] truncate">
                  "{note.slice(0, 45)}{note.length > 45 ? "…" : ""}"
                </span>
              ) : undefined
            }
            onToggleExpand={() => setEditingStep(editingStep === 6 ? null : 6)}
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
                  "w-full rounded-[12px] border border-[#E2D9C8] bg-[#FFFDF8] p-3.5 text-sm text-[#26332D] placeholder-[#5F6B62]/60 outline-none transition-colors",
                  "focus:border-[#193F32] focus:ring-2 focus:ring-[#193F32]",
                  errors.note && "border-[#DF806B] focus:ring-[#DF806B]"
                )}
              />
              <div className="flex justify-between items-center text-[13px] text-[#5F6B62]">
                <span>Specific details help understand what support or practice the child needs.</span>
                <span className={cn(note.length > 450 && "text-[#DF806B] font-bold")}>
                  {note.length} / 500
                </span>
              </div>
            </div>
          </Step>

          {/* Mobile Summary Card & Save Button (visible only below 1280px) */}
          <div className="block xl:hidden pt-2">
            <ObservationSummaryCard
              child={selectedChild}
              date={observationDate}
              domain={domain}
              activity={selectedActivity}
              score={score}
              note={note}
              isSubmitting={isSubmitting}
              backendError={backendError}
              onSave={handleSaveObservation}
              onDismissError={() => setBackendError(null)}
            />
          </div>
        </div>

        {/* Right Column (about 35% on desktop): Sticky Summary Card */}
        <aside className="hidden xl:block xl:w-[35%] xl:max-w-md shrink-0 sticky top-6">
          <ObservationSummaryCard
            child={selectedChild}
            date={observationDate}
            domain={domain}
            activity={selectedActivity}
            score={score}
            note={note}
            isSubmitting={isSubmitting}
            backendError={backendError}
            onSave={handleSaveObservation}
            onDismissError={() => setBackendError(null)}
          />
        </aside>
      </div>

      {/* Saved Observations Section */}
      <section className="pt-10 border-t border-[#E2D9C8]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#193F32]">
              Saved Observations
            </h2>
            <p className="text-[14px] text-[#5F6B62] mt-0.5">
              Review, edit, or remove past classroom observations stored in VikasSetu.
            </p>
          </div>

          <button
            type="button"
            onClick={loadObservations}
            disabled={isLoadingObservations}
            className="rounded-[10px] border border-[#E2D9C8] bg-[#F4EFE3] hover:bg-[#E2D9C8] text-[#193F32] px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#193F32]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingObservations && "animate-spin")} />
            <span>Refresh records</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="rounded-[14px] border border-[#E2D9C8] bg-[#FFFDF8] mb-6 p-4 flex flex-wrap items-center gap-4 text-sm shadow-[0_1px_2px_rgba(25,63,50,0.06)]">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#5F6B62]" />
            <span className="font-semibold text-[#5F6B62]">Filters:</span>
          </div>

          {/* Child filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-child" className="text-xs text-[#5F6B62]">Child:</label>
            <select
              id="filter-child"
              value={filterChild}
              onChange={(e) => setFilterChild(e.target.value)}
              className="rounded-[10px] border border-[#E2D9C8] bg-[#FFFDF8] px-2.5 py-1 text-sm text-[#26332D] font-medium focus:outline-none focus:ring-2 focus:ring-[#193F32]"
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
            <label htmlFor="filter-domain" className="text-xs text-[#5F6B62]">Area:</label>
            <select
              id="filter-domain"
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="rounded-[10px] border border-[#E2D9C8] bg-[#FFFDF8] px-2.5 py-1 text-sm text-[#26332D] font-medium focus:outline-none focus:ring-2 focus:ring-[#193F32]"
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
          <label className="flex items-center gap-2 cursor-pointer ml-auto text-xs font-semibold text-[#5F6B62]">
            <input
              type="checkbox"
              checked={includeBaseline}
              onChange={(e) => setIncludeBaseline(e.target.checked)}
              className="rounded border-[#E2D9C8] text-[#193F32] focus:ring-[#193F32] accent-[#193F32]"
            />
            <span>Include baseline records ({observationsList.length})</span>
          </label>
        </div>

        {/* Observations List */}
        {isLoadingObservations ? (
          <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] flex items-center justify-center p-12 text-[#5F6B62] gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#193F32]" />
            <span>Loading saved observations...</span>
          </div>
        ) : filteredObservations.length === 0 ? (
          <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-10 text-center text-[#5F6B62]">
            <p className="font-bold text-base text-[#26332D]">No observations found</p>
            <p className="text-sm mt-1">
              {filterChild !== "all" || filterDomain !== "all"
                ? "Try clearing your filters or recording a new observation above."
                : "No observations have been recorded yet. Use the form above to record one."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredObservations.map((o) => {
              const c = childrenList.find((x) => x.id === o.childId);
              const activity = activitiesList.find((a) => a.id === o.activityId) || activityOf(o.activityId);

              return (
                <li
                  key={o.id}
                  className="rounded-[14px] border border-[#E2D9C8] bg-[#FFFDF8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 transition-colors hover:border-[#193F32]/40 shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {c ? (
                      <Link to="/children/$id" params={{ id: c.id }} className="shrink-0 hover:opacity-85">
                        <ChildAvatar child={c} size="card" />
                      </Link>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4EFE3] text-lg">
                        🧒🏽
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {c ? (
                          <Link
                            to="/children/$id"
                            params={{ id: c.id }}
                            className="font-bold text-[#26332D] hover:text-[#193F32] hover:underline"
                          >
                            {c.name}
                          </Link>
                        ) : (
                          <span className="font-bold text-[#5F6B62]">{o.childId}</span>
                        )}
                        <span className="rounded-[8px] border border-[#E2D9C8] bg-[#F4EFE3] px-2 py-0.5 text-xs font-semibold text-[#193F32]">
                          {domainOf(o.domain)?.emoji} {domainOf(o.domain)?.short}
                        </span>
                        <span className="text-xs text-[#5F6B62]">
                          {formatDate(o.date)}
                        </span>
                        {o.isBaseline && (
                          <span className="rounded-[6px] bg-[#E2D9C8]/60 px-2 py-0.5 text-[10px] font-bold text-[#5F6B62] uppercase">
                            Baseline
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[#26332D]">
                        <span className="font-semibold text-[#26332D]">
                          {activity?.name || o.activityId}
                        </span>
                        {o.note && (
                          <span className="text-[#5F6B62]"> — "{o.note}"</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="rounded-[8px] bg-[#DCE9DD] text-[#193F32] font-bold text-xs px-2.5 py-1">
                      {SCORE_EMOJI[o.score]} Level {o.score}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(o)}
                      className="p-2 rounded-[8px] text-[#5F6B62] hover:text-[#193F32] hover:bg-[#F4EFE3] transition-colors cursor-pointer"
                      title="Edit observation"
                      aria-label="Edit observation"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingObservation(o)}
                      className="p-2 rounded-[8px] text-[#5F6B62] hover:text-[#DF806B] hover:bg-[#DF806B]/10 transition-colors cursor-pointer"
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
        <DialogContent className="max-w-lg rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#193F32]">
              Edit Observation
            </DialogTitle>
            <DialogDescription className="text-sm text-[#5F6B62]">
              Update the domain, activity, score, or notes for this record. Child scores will be automatically recalculated.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="rounded-[10px] border border-[#DF806B] bg-[#DF806B]/10 p-3 text-[#DF806B] text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Domain Selector */}
            <div>
              <label className="text-xs font-bold text-[#5F6B62] uppercase tracking-wide block mb-1.5">
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
                className="w-full rounded-[10px] border border-[#E2D9C8] bg-[#FFFDF8] p-2.5 text-sm text-[#26332D] font-medium focus:outline-none focus:ring-2 focus:ring-[#193F32]"
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
              <label className="text-xs font-bold text-[#5F6B62] uppercase tracking-wide block mb-1.5">
                Activity ({activitiesList.length} available)
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
                className="w-full rounded-[10px] border border-[#E2D9C8] bg-[#FFFDF8] p-2.5 text-sm text-[#26332D] font-medium focus:outline-none focus:ring-2 focus:ring-[#193F32]"
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
              <label className="text-xs font-bold text-[#5F6B62] uppercase tracking-wide block mb-1.5">
                Score / Rating
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as Score[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditScore(s)}
                    className={cn(
                      "rounded-[10px] border p-2.5 text-center font-bold text-sm transition-colors cursor-pointer",
                      editScore === s
                        ? "bg-[#DCE9DD] border-2 border-[#193F32] text-[#193F32]"
                        : "bg-[#FFFDF8] border-[#E2D9C8] hover:bg-[#F4EFE3] text-[#26332D]"
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
              <label className="text-xs font-bold text-[#5F6B62] uppercase tracking-wide block mb-1.5">
                Observation Notes
              </label>
              <textarea
                value={editNote}
                maxLength={500}
                onChange={(e) => setEditNote(e.target.value)}
                rows={3}
                className="w-full rounded-[10px] border border-[#E2D9C8] bg-[#FFFDF8] p-3 text-sm text-[#26332D] outline-none focus:ring-2 focus:ring-[#193F32]"
                placeholder="Observation notes..."
              />
              <div className="text-right text-xs text-[#5F6B62] mt-1">
                {editNote.length} / 500
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setEditingObservation(null)}
              className="rounded-[10px] border border-[#E2D9C8] bg-[#F4EFE3] hover:bg-[#E2D9C8] text-[#193F32] px-4 py-2 text-sm font-semibold cursor-pointer"
              disabled={isEditSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isEditSubmitting}
              className="rounded-[10px] bg-[#193F32] hover:bg-[#193F32]/90 text-white px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(25,63,50,0.06)]"
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
        <DialogContent className="max-w-md rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#193F32]">
              Delete Observation?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#5F6B62]">
              Are you sure you want to permanently delete this observation? The child's progress scores and strengths/needs will be recalculated automatically.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="rounded-[10px] border border-[#DF806B] bg-[#DF806B]/10 p-3 text-[#DF806B] text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <button
              type="button"
              onClick={() => setDeletingObservation(null)}
              className="rounded-[10px] border border-[#E2D9C8] bg-[#F4EFE3] hover:bg-[#E2D9C8] text-[#193F32] px-4 py-2 text-sm font-semibold cursor-pointer"
              disabled={isDeleteSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleteSubmitting}
              className="rounded-[10px] bg-[#DF806B] hover:bg-[#DF806B]/90 text-white px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
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
  isExpanded,
  summaryText,
  onToggleExpand,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  disabled?: boolean | undefined;
  error?: string | undefined;
  isExpanded: boolean;
  summaryText?: React.ReactNode;
  onToggleExpand?: () => void;
  children: React.ReactNode;
}) {
  // If step is done and not expanded, collapse into a one-line summary row with an "Edit" action
  if (done && !isExpanded) {
    return (
      <section
        className={cn(
          "rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] px-5 py-4 shadow-[0_1px_2px_rgba(25,63,50,0.06)] transition-colors",
          disabled && "opacity-60 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between gap-3 min-h-[36px]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DCE9DD] text-[#193F32]">
              <Check className="h-4 w-4 stroke-[2.5]" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <span className="text-[15px] font-bold text-[#26332D] shrink-0">{title}:</span>
              {summaryText && (
                <div className="text-[14px] text-[#5F6B62] truncate">{summaryText}</div>
              )}
            </div>
          </div>
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="text-xs font-bold text-[#193F32] hover:underline px-2.5 py-1.5 rounded-[8px] hover:bg-[#F4EFE3] transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#193F32]"
            >
              Edit
            </button>
          )}
        </div>
      </section>
    );
  }

  // Expanded state
  return (
    <section
      className={cn(
        "rounded-[16px] border bg-[#FFFDF8] p-5 sm:p-6 shadow-[0_1px_2px_rgba(25,63,50,0.06)] transition-colors",
        disabled && "opacity-50 pointer-events-none",
        error ? "border-2 border-[#DF806B]" : "border-[#E2D9C8]"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
              done
                ? "bg-[#DCE9DD] text-[#193F32]"
                : disabled
                  ? "bg-[#F4EFE3] text-[#5F6B62]"
                  : "bg-[#193F32] text-white"
            )}
          >
            {done ? <Check className="h-4 w-4 stroke-[2.5]" /> : n}
          </span>
          <h2 className={cn("text-lg font-bold", disabled ? "text-[#5F6B62]" : "text-[#26332D]")}>
            {title}
          </h2>
        </div>
        {done && onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-xs font-semibold text-[#5F6B62] hover:text-[#193F32] px-2 py-1 rounded-[6px] hover:bg-[#F4EFE3] cursor-pointer"
          >
            Done
          </button>
        )}
      </div>

      {children}

      {error && (
        <p className="mt-2.5 text-xs font-semibold text-[#DF806B] flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </section>
  );
}

function ObservationSummaryCard({
  child,
  date,
  domain,
  activity,
  score,
  note,
  isSubmitting,
  backendError,
  onSave,
  onDismissError,
}: {
  child?: Child | undefined;
  date: string;
  domain?: DomainId | undefined;
  activity?: Activity | undefined;
  score?: Score | undefined;
  note: string;
  isSubmitting: boolean;
  backendError: string | null;
  onSave: () => void;
  onDismissError: () => void;
}) {
  const isReady = !!child && !!date && !!domain && !!activity && !!score && !!note.trim();

  return (
    <div className="rounded-[16px] border border-[#E2D9C8] bg-[#FFFDF8] p-5 sm:p-6 shadow-[0_1px_2px_rgba(25,63,50,0.06)] space-y-4">
      <div>
        <h3 className="text-base font-bold text-[#193F32]">
          Observation Summary
        </h3>
        <p className="text-[12px] text-[#5F6B62]">
          Live preview of the entry
        </p>
      </div>

      <div className="space-y-2 text-sm">
        {/* Child */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-[10px] bg-[#F4EFE3] border border-[#E2D9C8]/60">
          <span className="text-[12px] font-bold text-[#5F6B62] uppercase tracking-wide">Child</span>
          {child ? (
            <div className="flex items-center gap-2 min-w-0">
              <ChildAvatar child={child} size="selector" />
              <span className="font-bold text-[#26332D] truncate">{child.name}</span>
            </div>
          ) : (
            <span className="text-[13px] text-[#5F6B62] italic">Select child</span>
          )}
        </div>

        {/* Date */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-[10px] bg-[#F4EFE3] border border-[#E2D9C8]/60">
          <span className="text-[12px] font-bold text-[#5F6B62] uppercase tracking-wide">Date</span>
          <span className="font-medium text-[#26332D] text-[13px]">{formatDate(date)}</span>
        </div>

        {/* Learning Area */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-[10px] bg-[#F4EFE3] border border-[#E2D9C8]/60">
          <span className="text-[12px] font-bold text-[#5F6B62] uppercase tracking-wide">Area</span>
          {domain ? (
            <div className="flex items-center gap-1.5 font-medium text-[#26332D] text-[13px] truncate">
              <span>{domainOf(domain)?.emoji}</span>
              <span className="truncate">{domainOf(domain)?.name}</span>
            </div>
          ) : (
            <span className="text-[13px] text-[#5F6B62] italic">Select area</span>
          )}
        </div>

        {/* Activity */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-[10px] bg-[#F4EFE3] border border-[#E2D9C8]/60">
          <span className="text-[12px] font-bold text-[#5F6B62] uppercase tracking-wide">Activity</span>
          {activity ? (
            <div className="flex items-center gap-1.5 font-medium text-[#26332D] text-[13px] truncate">
              <span>{activity.emoji}</span>
              <span className="truncate">{activity.name}</span>
            </div>
          ) : (
            <span className="text-[13px] text-[#5F6B62] italic">Select activity</span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-[10px] bg-[#F4EFE3] border border-[#E2D9C8]/60">
          <span className="text-[12px] font-bold text-[#5F6B62] uppercase tracking-wide">Rating</span>
          {score ? (
            <div className="flex items-center gap-1.5 font-bold text-[#193F32] text-[13px]">
              <span>{SCORE_EMOJI[score]}</span>
              <span>Level {score} — {SCORE_LABEL[score]}</span>
            </div>
          ) : (
            <span className="text-[13px] text-[#5F6B62] italic">Give rating</span>
          )}
        </div>

        {/* Notes preview */}
        <div className="p-2.5 rounded-[10px] bg-[#F4EFE3] border border-[#E2D9C8]/60">
          <span className="text-[12px] font-bold text-[#5F6B62] uppercase tracking-wide block mb-0.5">Notes</span>
          {note.trim() ? (
            <p className="text-[12px] text-[#26332D] line-clamp-2 italic leading-relaxed">
              "{note.trim()}"
            </p>
          ) : (
            <span className="text-[12px] text-[#5F6B62] italic">Notes required before saving</span>
          )}
        </div>
      </div>

      {backendError && (
        <div className="rounded-[10px] border border-[#DF806B] bg-[#DF806B]/10 p-3 text-[#DF806B] text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{backendError}</div>
          <button type="button" onClick={onDismissError} aria-label="Dismiss error" className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Save Button */}
      <button
        type="button"
        disabled={isSubmitting || !isReady}
        onClick={onSave}
        className={cn(
          "w-full h-[52px] rounded-[12px] text-base font-bold transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193F32]",
          isReady && !isSubmitting
            ? "bg-[#193F32] text-white hover:bg-[#193F32]/90 shadow-[0_1px_2px_rgba(25,63,50,0.06)] cursor-pointer"
            : "bg-[#F4EFE3] text-[#5F6B62] border border-[#E2D9C8] cursor-not-allowed shadow-none"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-white" />
            <span>Saving Observation...</span>
          </>
        ) : (
          <span>Save Observation</span>
        )}
      </button>
    </div>
  );
}
