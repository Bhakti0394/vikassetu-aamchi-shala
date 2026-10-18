import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { useStore, isPresentToday } from "@/lib/store";
import { avgLevel, domainOf, strongestDomain, weakestDomain } from "@/lib/data";
import { Avatar, PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/children/")({
  validateSearch: (s: Record<string, unknown>): { add?: boolean } =>
    s["add"] ? { add: true } : {},
  head: () => ({
    meta: [
      { title: "Children — VikasSetu" },
      {
        name: "description",
        content: "Every child's learning level, strengths and areas needing attention.",
      },
      { property: "og:title", content: "Children — VikasSetu" },
      {
        property: "og:description",
        content: "Every child's learning level, strengths and areas needing attention.",
      },
    ],
  }),
  component: ChildrenPage,
});

function ChildrenPage() {
  const { children, attendance, addChild } = useStore();
  const { add } = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState(4);
  const list = children.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const closeAdd = () => navigate({ to: "/children", search: {} });

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Our class"
        title="Children"
        subtitle="Tap a child to see how they are learning and what to try next."
        action={
          <Link to="/children" search={{ add: true }} className="btn btn-primary">
            <Plus className="h-4 w-4" /> Add Child
          </Link>
        }
      />

      {add && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const id = addChild(name.trim(), age);
            navigate({ to: "/children/$id", params: { id } });
          }}
          className="card-soft fade-up mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
        >
          <label className="flex-1">
            <span className="text-sm font-bold">Child's name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Priya"
            />
          </label>
          <label>
            <span className="text-sm font-bold">Age</span>
            <div className="mt-1 flex gap-2">
              {[3, 4, 5].map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setAge(a)}
                  className={cn(
                    "h-12 w-12 rounded-xl border font-bold",
                    age === a && "border-primary bg-primary-soft text-primary",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </label>
          <button className="btn btn-primary h-12">Save</button>
          <button type="button" onClick={closeAdd} className="btn btn-ghost h-12">
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className="w-full rounded-2xl border bg-card py-3.5 pl-12 pr-4 shadow-soft outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
        {list.map((ch) => {
          const present = isPresentToday(attendance, ch.id);
          const strong = domainOf(strongestDomain(ch));
          const weak = domainOf(weakestDomain(ch));
          return (
            <Link
              key={ch.id}
              to="/children/$id"
              params={{ id: ch.id }}
              className="card-soft tilt shine block p-5"
            >
              <div className="flex items-start gap-3">
                <Avatar child={ch} />
                <div className="flex-1">
                  <p className="font-display text-xl font-bold">{ch.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ch.age} years · Level {avgLevel(ch).toFixed(1)}/3
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-bold",
                    present ? "bg-primary-soft text-primary" : "bg-coral-soft text-coral",
                  )}
                >
                  {present ? "Present" : "Absent"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-primary-soft p-3">
                  <p className="text-xs font-bold text-muted-foreground">Strongest</p>
                  <p className="font-bold">
                    {strong ? `${strong.emoji} ${strong.short}` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-sun-soft p-3">
                  <p className="text-xs font-bold text-muted-foreground">Needs attention</p>
                  <p className="font-bold">
                    {weak ? `${weak.emoji} ${weak.short}` : "—"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
