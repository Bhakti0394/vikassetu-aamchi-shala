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

export const domainOf = (id: DomainId) => (DOMAINS.find((d) => d.id === id) ?? DOMAINS[0])!;

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
  {
    id: "number-hopscotch",
    name: "Jump and Learn Numbers",
    domain: "numbers",
    difficulty: "Easy",
    minutes: 15,
    emoji: "🦘",
    forLevel: [1, 2],
    skills: ["Counting numbers 1 to 6", "Hopping and balance"],
    steps: [
      "Draw boxes on the ground with chalk and write numbers 1 to 6 inside.",
      "Jump into each box, saying the number out loud as you land.",
      "Hold a child's hand and jump together, counting each step.",
      "Let each child try jumping and saying the numbers. Clap for every turn!",
    ],
  },
  {
    id: "bridge-builders",
    name: "Build a Paper Bridge",
    domain: "numbers",
    difficulty: "Medium",
    minutes: 20,
    emoji: "🌉",
    forLevel: [2, 3],
    skills: ["Counting bottle caps", "Heavy and light"],
    steps: [
      "Put two books a little apart. Place a sheet of paper across them like a bridge.",
      "Put bottle caps on the paper one by one while the children count out loud.",
      "Fold the paper to make it stronger and see how many more caps it can hold.",
      "Talk together about which paper bridge held more caps. Praise everyone for trying!",
    ],
  },
  {
    id: "colour-mixing-lab",
    name: "Mix Colours",
    domain: "colours",
    difficulty: "Medium",
    minutes: 20,
    emoji: "🧪",
    forLevel: [2, 3],
    skills: ["Learning colours", "Guessing new colours"],
    steps: [
      "Fill three small cups with red, yellow, and blue water.",
      "Ask children: 'What colour will we get if we mix red and yellow?'",
      "Pour a little of each into an empty cup and watch the new colour appear.",
      "Let children mix other colours together and point to things in the room with that colour.",
    ],
  },
  {
    id: "shadow-detective",
    name: "Find the Shadow",
    domain: "colours",
    difficulty: "Medium",
    minutes: 15,
    emoji: "🕵️",
    forLevel: [2, 3],
    skills: ["Looking closely", "Matching shapes"],
    steps: [
      "Take the children outside in the sunshine with a ball, a box, and a leaf.",
      "Point to the shadow on the ground and ask: 'Which object made this shadow?'",
      "Move the object and show how the shadow moves too.",
      "Let children hold an object, find its shadow, and tell if it is round or straight.",
    ],
  },
  {
    id: "shape-hunt-walk",
    name: "Find Shapes Around Us",
    domain: "colours",
    difficulty: "Easy",
    minutes: 15,
    emoji: "🔷",
    forLevel: [1, 2],
    skills: ["Finding shapes", "Naming shapes"],
    steps: [
      "Draw a circle, square, and triangle on the floor with chalk. Say their names together.",
      "Ask children to look around the room and find something round, like a plate or a bangle.",
      "Children bring their objects and place them inside the matching chalk shape.",
      "Count the objects inside each shape together and clap for all the good finds!",
    ],
  },
  {
    id: "rhythm-name-clap",
    name: "Clap Our Names",
    domain: "alphabet",
    difficulty: "Easy",
    minutes: 10,
    emoji: "👏",
    forLevel: [1, 2],
    skills: ["Clapping beats", "Listening carefully"],
    steps: [
      "Sit in a circle. Say your name and clap for each part (like 'Sa-ri-ta' = 3 claps).",
      "Say each child's name and have the whole group clap the beats together.",
      "Try clapping the names of fruits or animals that children like.",
      "Ask children to listen and guess whose name has 2 claps or 3 claps.",
    ],
  },
  {
    id: "story-stones",
    name: "Tell a Stone Story",
    domain: "alphabet",
    difficulty: "Medium",
    minutes: 15,
    emoji: "🪨",
    forLevel: [2, 3],
    skills: ["Speaking in sentences", "Using new words"],
    steps: [
      "Draw simple pictures on smooth stones using chalk (like sun, tree, cow, house).",
      "Hold up the first stone and start a simple story: 'One sunny morning, a little cow went for a walk...'",
      "Pass the stones to children and let each child add one line to the story.",
      "Repeat the whole story together so everyone feels proud of their part.",
    ],
  },
  {
    id: "nature-treasure-mandala",
    name: "Find Things in Nature",
    domain: "art",
    difficulty: "Easy",
    minutes: 20,
    emoji: "🌼",
    forLevel: [1, 2, 3],
    skills: ["Collecting natural items", "Making simple patterns"],
    steps: [
      "Walk together outside and pick up fallen leaves, flower petals, and small pebbles.",
      "Sort the items into small piles: leaves together, stones together.",
      "Draw a big circle on the ground with chalk.",
      "Show children how to place a leaf, then a stone, then a leaf to make a pretty circle pattern.",
    ],
  },
  {
    id: "seed-diary",
    name: "Watch a Seed Grow",
    domain: "stories",
    difficulty: "Medium",
    minutes: 10,
    emoji: "🌱",
    forLevel: [2, 3],
    skills: ["Caring for plants", "Daily observation"],
    steps: [
      "Soak a few moong or methi seeds in water overnight.",
      "Put some mud in a small cup or cut bottle and plant the seeds. Let children sprinkle a little water.",
      "Place the cup near sunlight. Check it every morning together to see tiny green sprouts come out.",
      "Draw what the little plant looks like on the slate each day.",
    ],
  },
  {
    id: "freeze-and-feel-dance",
    name: "Dance and Freeze",
    domain: "stories",
    difficulty: "Easy",
    minutes: 10,
    emoji: "💃",
    forLevel: [1, 2, 3],
    skills: ["Naming feelings", "Listening and stopping"],
    steps: [
      "Show simple happy, sad, and sleepy faces and make the faces together.",
      "Clap hands or beat a small drum while the children dance happily.",
      "Stop clapping and shout 'Freeze!' Children must stop still like statues.",
      "Call out: 'Freeze with a big smile!' and talk about what makes them happy.",
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
  isBaseline?: boolean;
};

export type Child = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  tone: Tone;
  scores: Record<DomainId, Score>;
  observedDomains?: DomainId[];
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
  c(
    "yash-zs1c",
    "Yash",
    4,
    "🧒🏽",
    "teal",
    [1, 1, 1, 1, 1],
    [],
    ["First observations pending"],
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

export { type Recommendation, recommendFor } from "./recommend";
