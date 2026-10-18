export type DomainId = "alphabet" | "numbers" | "colours" | "art" | "stories";
export type Score = 1 | 2 | 3;

export const DOMAINS: { id: DomainId; name: string; short: string; emoji: string; tone: Tone }[] = [
  { id: "alphabet", name: "Alphabet & Language", short: "Alphabet", emoji: "🔤", tone: "teal" },
  { id: "numbers", name: "Numbers & Counting", short: "Numbers", emoji: "🔢", tone: "sun" },
  { id: "colours", name: "Colours & Shapes", short: "Colours", emoji: "🎨", tone: "coral" },
  { id: "art", name: "Art & Creativity", short: "Art", emoji: "🖍️", tone: "sky" },
  {
    id: "stories",
    name: "Stories, Habits & Games",
    short: "Stories",
    emoji: "📖",
    tone: "primary",
  },
];

export type Tone = "teal" | "sun" | "coral" | "sky" | "primary";
export const toneBg: Record<Tone, string> = {
  teal: "bg-teal-soft",
  sun: "bg-sun-soft",
  coral: "bg-coral-soft",
  sky: "bg-sky-soft",
  primary: "bg-primary-soft",
};
export const toneFill: Record<Tone, string> = {
  teal: "bg-teal",
  sun: "bg-sun",
  coral: "bg-coral",
  sky: "bg-sky",
  primary: "bg-primary",
};
export const toneText: Record<Tone, string> = {
  teal: "text-teal",
  sun: "text-foreground",
  coral: "text-coral",
  sky: "text-sky",
  primary: "text-primary",
};

export const domainOf = (id: DomainId) => DOMAINS.find((d) => d.id === id) ?? DOMAINS[0];

export const SCORE_LABEL: Record<Score, string> = {
  1: "Needs Support",
  2: "Developing",
  3: "Good",
};

export type Activity = {
  id: string;
  name: string;
  domain: DomainId;
  difficulty: "Easy" | "Medium";
  minutes: number;
  skills: string[];
  emoji: string;
  steps: string[];
  forLevel: Score[];
};

export const ACTIVITIES: Activity[] = [
  {
    id: "alphabet-match",
    name: "Alphabet Match",
    domain: "alphabet",
    difficulty: "Easy",
    minutes: 10,
    emoji: "🅰️",
    forLevel: [1],
    skills: ["Alphabet recognition", "Letter matching"],
    steps: [
      "Lay out 5 letter cards (A–E).",
      "Show a picture card and say its sound.",
      "Child picks the matching letter.",
      "Praise every attempt.",
    ],
  },
  {
    id: "letter-sounds",
    name: "Letter Sound Song",
    domain: "alphabet",
    difficulty: "Easy",
    minutes: 10,
    emoji: "🎵",
    forLevel: [1, 2],
    skills: ["Phonics", "Listening"],
    steps: [
      "Sing the letter song together.",
      "Pause on a letter and let the child say the sound.",
      "Clap for each correct sound.",
    ],
  },
  {
    id: "name-tracing",
    name: "Trace My Name",
    domain: "alphabet",
    difficulty: "Medium",
    minutes: 15,
    emoji: "✏️",
    forLevel: [2, 3],
    skills: ["Letter formation", "Fine motor"],
    steps: [
      "Write the child's name in dotted letters.",
      "Child traces with a crayon.",
      "Say each letter aloud while tracing.",
    ],
  },
  {
    id: "count-match",
    name: "Count & Match",
    domain: "numbers",
    difficulty: "Easy",
    minutes: 10,
    emoji: "🧮",
    forLevel: [1, 2],
    skills: ["Number recognition", "Counting"],
    steps: [
      "Place number cards 1–5.",
      "Give the child a handful of pebbles.",
      "Child places the right number of pebbles on each card.",
    ],
  },
  {
    id: "bead-counting",
    name: "Bead Counting",
    domain: "numbers",
    difficulty: "Medium",
    minutes: 15,
    emoji: "📿",
    forLevel: [2, 3],
    skills: ["Counting beyond 5", "One-to-one matching"],
    steps: [
      "Give a string and beads.",
      "Ask the child to thread 6, then 8, then 10 beads.",
      "Count together aloud.",
    ],
  },
  {
    id: "colour-hunt",
    name: "Colour Hunt",
    domain: "colours",
    difficulty: "Easy",
    minutes: 15,
    emoji: "🔍",
    forLevel: [1, 2],
    skills: ["Colour recognition", "Vocabulary"],
    steps: [
      "Name a colour.",
      "Child finds 3 things of that colour in the room.",
      "Repeat with a new colour.",
    ],
  },
  {
    id: "shape-sort",
    name: "Shape Sorting",
    domain: "colours",
    difficulty: "Medium",
    minutes: 10,
    emoji: "🔺",
    forLevel: [2, 3],
    skills: ["Shape recognition", "Sorting"],
    steps: [
      "Mix paper circles, squares and triangles.",
      "Child sorts them into three groups.",
      "Name each shape together.",
    ],
  },
  {
    id: "leaf-painting",
    name: "Leaf Printing",
    domain: "art",
    difficulty: "Easy",
    minutes: 20,
    emoji: "🍃",
    forLevel: [1, 2, 3],
    skills: ["Creativity", "Fine motor"],
    steps: [
      "Collect a few leaves.",
      "Dip leaves in paint.",
      "Press onto paper and talk about the patterns.",
    ],
  },
  {
    id: "free-drawing",
    name: "Draw My Family",
    domain: "art",
    difficulty: "Easy",
    minutes: 15,
    emoji: "🖍️",
    forLevel: [1, 2],
    skills: ["Expression", "Crayon grip"],
    steps: [
      "Give paper and crayons.",
      "Ask the child to draw their family.",
      "Let them tell you about the drawing.",
    ],
  },
  {
    id: "story-circle",
    name: "Story Circle",
    domain: "stories",
    difficulty: "Easy",
    minutes: 15,
    emoji: "📚",
    forLevel: [1, 2],
    skills: ["Listening", "Speaking in a group"],
    steps: [
      "Sit in a circle.",
      "Read a short picture story.",
      "Ask each child one simple question about it.",
    ],
  },
  {
    id: "handwash-song",
    name: "Handwash Habit Song",
    domain: "stories",
    difficulty: "Easy",
    minutes: 10,
    emoji: "🧼",
    forLevel: [1, 2, 3],
    skills: ["Hygiene habits", "Following steps"],
    steps: [
      "Sing the handwash song.",
      "Practise the 6 steps at the tap.",
      "Give a star sticker for every step done.",
    ],
  },
];

export const activityOf = (id: string) => ACTIVITIES.find((a) => a.id === id);

export type Observation = {
  id: string;
  childId: string;
  domain: DomainId;
  activityId: string;
  score: Score;
  note: string;
  date: string;
};

export type Child = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  tone: Tone;
  scores: Record<DomainId, Score>;
  strengths: string[];
  needs: string[];
};

const c = (
  id: string,
  name: string,
  age: number,
  avatar: string,
  tone: Tone,
  s: [Score, Score, Score, Score, Score],
  strengths: string[],
  needs: string[],
): Child => ({
  id,
  name,
  age,
  avatar,
  tone,
  strengths,
  needs,
  scores: { alphabet: s[0], numbers: s[1], colours: s[2], art: s[3], stories: s[4] },
});

export const SEED_CHILDREN: Child[] = [
  c(
    "aarav",
    "Aarav",
    4,
    "👦🏽",
    "teal",
    [1, 2, 3, 2, 2],
    ["Recognises basic colours", "Sorts shapes confidently"],
    ["Alphabet recognition", "Letter sounds"],
  ),
  c(
    "anaya",
    "Anaya",
    4,
    "👧🏽",
    "coral",
    [3, 1, 2, 3, 2],
    ["Knows letters A–J", "Loves drawing activities"],
    ["Counting beyond 5", "Number recognition"],
  ),
  c(
    "vihaan",
    "Vihaan",
    3,
    "🧒🏽",
    "sun",
    [2, 2, 1, 1, 2],
    ["Listens well during stories"],
    ["Colour names", "Holding crayons"],
  ),
  c(
    "diya",
    "Diya",
    5,
    "👧🏾",
    "sky",
    [3, 3, 3, 2, 3],
    ["Counts to 10", "Tells stories with pictures", "Recognises most letters"],
    ["Patience during art"],
  ),
  c(
    "kabir",
    "Kabir",
    4,
    "👦🏾",
    "primary",
    [2, 3, 2, 2, 1],
    ["Counts objects accurately"],
    ["Speaking in a group", "Following routines"],
  ),
  c(
    "saanvi",
    "Saanvi",
    3,
    "👧🏻",
    "teal",
    [1, 1, 2, 3, 2],
    ["Very creative with colours", "Participates in drawing"],
    ["Alphabet recognition", "Counting 1–5"],
  ),
  c(
    "arjun",
    "Arjun",
    5,
    "👦🏻",
    "sun",
    [2, 2, 3, 3, 3],
    ["Knows shapes", "Helps friends", "Follows handwash routine"],
    ["Letter formation"],
  ),
  c(
    "meera",
    "Meera",
    4,
    "👧🏽",
    "coral",
    [2, 1, 1, 2, 3],
    ["Enjoys songs and games"],
    ["Number recognition", "Colour names"],
  ),
  c(
    "rohan",
    "Rohan",
    3,
    "🧒🏾",
    "sky",
    [1, 2, 2, 1, 1],
    ["Curious and energetic"],
    ["Alphabet recognition", "Sitting for stories"],
  ),
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const SEED_OBSERVATIONS: Observation[] = [
  {
    id: "o1",
    childId: "aarav",
    domain: "alphabet",
    activityId: "alphabet-match",
    score: 1,
    note: "Recognised A and B but needed help with C, D and E.",
    date: daysAgo(3),
  },
  {
    id: "o2",
    childId: "anaya",
    domain: "numbers",
    activityId: "count-match",
    score: 1,
    note: "Counted up to 4 correctly, then lost track.",
    date: daysAgo(2),
  },
  {
    id: "o3",
    childId: "diya",
    domain: "numbers",
    activityId: "bead-counting",
    score: 3,
    note: "Threaded 10 beads and counted aloud without help.",
    date: daysAgo(2),
  },
  {
    id: "o4",
    childId: "vihaan",
    domain: "colours",
    activityId: "colour-hunt",
    score: 1,
    note: "Found red objects but mixed up blue and green.",
    date: daysAgo(1),
  },
  {
    id: "o5",
    childId: "saanvi",
    domain: "art",
    activityId: "leaf-painting",
    score: 3,
    note: "Made beautiful prints, explained the colours she chose.",
    date: daysAgo(1),
  },
  {
    id: "o6",
    childId: "kabir",
    domain: "stories",
    activityId: "story-circle",
    score: 1,
    note: "Listened quietly but did not answer questions yet.",
    date: daysAgo(4),
  },
];

// Deterministic past attendance for the month (1 = present)
export function seedAttendance(children: Child[]): Record<string, Record<string, boolean>> {
  const out: Record<string, Record<string, boolean>> = {};
  const today = new Date();
  children.forEach((ch, ci) => {
    const day: Record<string, boolean> = (out[ch.id] = {});
    for (let d = 1; d < today.getDate(); d++) {
      const dt = new Date(today.getFullYear(), today.getMonth(), d);
      if (dt.getDay() === 0) continue;
      day[dateKey(dt)] = (d * 7 + ci * 3) % 10 > (ci % 3 === 2 ? 2 : 0);
    }
    day[dateKey(today)] = ci !== 2 && ci !== 7;
  });
  return out;
}

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function weakestDomain(ch: Child): DomainId {
  return DOMAINS.reduce((w, d) => (ch.scores[d.id] < ch.scores[w] ? d.id : w), DOMAINS[0]!.id);
}
export function strongestDomain(ch: Child): DomainId {
  return DOMAINS.reduce((w, d) => (ch.scores[d.id] > ch.scores[w] ? d.id : w), DOMAINS[0]!.id);
}
export function avgLevel(ch: Child) {
  return DOMAINS.reduce((s, d) => s + ch.scores[d.id], 0) / DOMAINS.length;
}
export function needsAttention(ch: Child) {
  return DOMAINS.some((d) => ch.scores[d.id] === 1);
}

export type Recommendation = {
  child: Child;
  domain: DomainId;
  activity: Activity;
  level: Score;
  reason: string;
};

export function recommendFor(ch: Child): Recommendation[] {
  return DOMAINS.filter((d) => ch.scores[d.id] < 3)
    .sort((a, b) => ch.scores[a.id] - ch.scores[b.id])
    .slice(0, 2)
    .map((d) => {
      const level = ch.scores[d.id];
      const activity =
        ACTIVITIES.find((a) => a.domain === d.id && a.forLevel.includes(level)) ??
        ACTIVITIES.find((a) => a.domain === d.id)!;
      return {
        child: ch,
        domain: d.id,
        activity,
        level,
        reason: `Recommended because ${d.name} is currently at Level ${level}.`,
      };
    });
}
