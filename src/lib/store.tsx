import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  SEED_CHILDREN,
  SEED_OBSERVATIONS,
  seedAttendance,
  dateKey,
  DOMAINS,
  type Child,
  type Observation,
  type DomainId,
  type Score,
} from "./data";
import { PageLoader } from "@/components/PageLoader";

type State = {
  children: Child[];
  observations: Observation[];
  attendance: Record<string, Record<string, boolean>>;
  completed: number;
};

const KEY = "vikassetu-v1";
const initial = (): State => ({
  children: SEED_CHILDREN,
  observations: SEED_OBSERVATIONS,
  attendance: seedAttendance(SEED_CHILDREN),
  completed: 24,
});

type Ctx = State & {
  addObservation: (o: Omit<Observation, "id" | "date">) => void;
  addChild: (name: string, age: number) => string;
  setPresent: (childId: string, present: boolean) => void;
  reset: () => void;
  syncChild: (child: Child) => void;
  syncObservation: (obs: Observation) => void;
  removeObservationFromStore: (id: string) => void;
  setChildren: (children: Child[]) => void;
  setObservations: (observations: Observation[]) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let next = initial();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as State;
        if (Array.isArray(p.children) && p.attendance) next = p;
      }
    } catch {}
    setState(next);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, loaded]);

  const value: Ctx = {
    ...state,
    addObservation: (o) =>
      setState((s) => ({
        ...s,
        completed: s.completed + 1,
        observations: [
          { ...o, id: crypto.randomUUID(), date: new Date().toISOString() },
          ...s.observations,
        ],
        children: s.children.map((c) => {
          if (c.id !== o.childId) return c;
          const domain = DOMAINS.find((d) => d.id === o.domain);
          if (!domain) return c;
          const dn = domain.name;
          const good = `Doing well in ${dn}`,
            need = `More practice in ${dn}`;
          let strengths = c.strengths.filter((x) => x !== good);
          let needs = c.needs.filter((x) => x !== need && x !== "First observations pending");
          if (o.score === 3) {
            strengths = [good, ...strengths];
            needs = needs.filter((x) => !x.includes(dn));
          } else {
            needs = [need, ...needs];
            strengths = strengths.filter((x) => x !== good);
          }
          return { ...c, strengths, needs, scores: { ...c.scores, [o.domain]: o.score } };
        }),
      })),
    addChild: (name, age) => {
      const id =
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
        "-" +
        Math.random().toString(36).slice(2, 6);
      const avatars = ["👦🏽", "👧🏽", "🧒🏽", "👧🏾", "👦🏾"];
      setState((s) => ({
        ...s,
        children: [
          ...s.children,
          {
            id,
            name,
            age,
            avatar: avatars[s.children.length % avatars.length] ?? "🧒🏽",
            tone: "teal",
            scores: { alphabet: 1, numbers: 1, colours: 1, art: 1, stories: 1 } as Record<
              DomainId,
              Score
            >,
            strengths: [],
            needs: ["First observations pending"],
          },
        ],
        attendance: { ...s.attendance, [id]: { [dateKey(new Date())]: true } },
      }));
      return id;
    },
    setPresent: (childId, present) =>
      setState((s) => ({
        ...s,
        attendance: {
          ...s.attendance,
          [childId]: { ...s.attendance[childId], [dateKey(new Date())]: present },
        },
      })),
    reset: () => setState(initial()),
    syncChild: (child: Child) =>
      setState((s) => ({
        ...s,
        children: s.children.some((c) => c.id === child.id)
          ? s.children.map((c) => (c.id === child.id ? child : c))
          : [...s.children, child],
      })),
    syncObservation: (obs: Observation) =>
      setState((s) => ({
        ...s,
        observations: s.observations.some((o) => o.id === obs.id)
          ? s.observations.map((o) => (o.id === obs.id ? obs : o))
          : [obs, ...s.observations],
      })),
    removeObservationFromStore: (id: string) =>
      setState((s) => ({
        ...s,
        observations: s.observations.filter((o) => o.id !== id),
      })),
    setChildren: (children: Child[]) =>
      setState((s) => ({
        ...s,
        children,
      })),
    setObservations: (observations: Observation[]) =>
      setState((s) => ({
        ...s,
        observations,
      })),
  };

  return (
    <StoreCtx.Provider value={value}>
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}

export function isPresentToday(att: State["attendance"], id: string) {
  return !!att[id]?.[dateKey(new Date())];
}
export function attendancePct(att: State["attendance"], id: string) {
  const days = Object.values(att[id] ?? {});
  return days.length ? Math.round((days.filter(Boolean).length / days.length) * 100) : 0;
}
