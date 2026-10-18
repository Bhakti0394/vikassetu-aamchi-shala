import datetime

def days_ago(n: int) -> str:
    d = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=n)
    return d.strftime("%Y-%m-%dT%H:%M:%SZ")

DOMAINS = ["alphabet", "numbers", "colours", "art", "stories"]

ACTIVITIES = [
    {
        "id": "alphabet-match",
        "name": "Alphabet Match",
        "domain": "alphabet",
        "difficulty": "Easy",
        "minutes": 10,
        "emoji": "🅰️",
        "for_level": [1],
        "skills": ["Alphabet recognition", "Letter matching"],
        "steps": [
            "Lay out 5 letter cards (A–E).",
            "Show a picture card and say its sound.",
            "Child picks the matching letter.",
            "Praise every attempt.",
        ],
    },
    {
        "id": "letter-sounds",
        "name": "Letter Sound Song",
        "domain": "alphabet",
        "difficulty": "Easy",
        "minutes": 10,
        "emoji": "🎵",
        "for_level": [1, 2],
        "skills": ["Phonics", "Listening"],
        "steps": [
            "Sing the letter song together.",
            "Pause on a letter and let the child say the sound.",
            "Clap for each correct sound.",
        ],
    },
    {
        "id": "name-tracing",
        "name": "Trace My Name",
        "domain": "alphabet",
        "difficulty": "Medium",
        "minutes": 15,
        "emoji": "✏️",
        "for_level": [2, 3],
        "skills": ["Letter formation", "Fine motor"],
        "steps": [
            "Write the child's name in dotted letters.",
            "Child traces with a crayon.",
            "Say each letter aloud while tracing.",
        ],
    },
    {
        "id": "count-match",
        "name": "Count & Match",
        "domain": "numbers",
        "difficulty": "Easy",
        "minutes": 10,
        "emoji": "🧮",
        "for_level": [1, 2],
        "skills": ["Number recognition", "Counting"],
        "steps": [
            "Place number cards 1–5.",
            "Give the child a handful of pebbles.",
            "Child places the right number of pebbles on each card.",
        ],
    },
    {
        "id": "bead-counting",
        "name": "Bead Counting",
        "domain": "numbers",
        "difficulty": "Medium",
        "minutes": 15,
        "emoji": "📿",
        "for_level": [2, 3],
        "skills": ["Counting beyond 5", "One-to-one matching"],
        "steps": [
            "Give a string and beads.",
            "Ask the child to thread 6, then 8, then 10 beads.",
            "Count together aloud.",
        ],
    },
    {
        "id": "colour-hunt",
        "name": "Colour Hunt",
        "domain": "colours",
        "difficulty": "Easy",
        "minutes": 15,
        "emoji": "🔍",
        "for_level": [1, 2],
        "skills": ["Colour recognition", "Vocabulary"],
        "steps": [
            "Name a colour.",
            "Child finds 3 things of that colour in the room.",
            "Repeat with a new colour.",
        ],
    },
    {
        "id": "shape-sort",
        "name": "Shape Sorting",
        "domain": "colours",
        "difficulty": "Medium",
        "minutes": 10,
        "emoji": "🔺",
        "for_level": [2, 3],
        "skills": ["Shape recognition", "Sorting"],
        "steps": [
            "Mix paper circles, squares and triangles.",
            "Child sorts them into three groups.",
            "Name each shape together.",
        ],
    },
    {
        "id": "leaf-painting",
        "name": "Leaf Printing",
        "domain": "art",
        "difficulty": "Easy",
        "minutes": 20,
        "emoji": "🍃",
        "for_level": [1, 2, 3],
        "skills": ["Creativity", "Fine motor"],
        "steps": [
            "Collect a few leaves.",
            "Dip leaves in paint.",
            "Press onto paper and talk about the patterns.",
        ],
    },
    {
        "id": "free-drawing",
        "name": "Draw My Family",
        "domain": "art",
        "difficulty": "Easy",
        "minutes": 15,
        "emoji": "🖍️",
        "for_level": [1, 2],
        "skills": ["Expression", "Crayon grip"],
        "steps": [
            "Give paper and crayons.",
            "Ask the child to draw their family.",
            "Let them tell you about the drawing.",
        ],
    },
    {
        "id": "story-circle",
        "name": "Story Circle",
        "domain": "stories",
        "difficulty": "Easy",
        "minutes": 15,
        "emoji": "📚",
        "for_level": [1, 2],
        "skills": ["Listening", "Speaking in a group"],
        "steps": [
            "Sit in a circle.",
            "Read a short picture story.",
            "Ask each child one simple question about it.",
        ],
    },
    {
        "id": "handwash-song",
        "name": "Handwash Habit Song",
        "domain": "stories",
        "difficulty": "Easy",
        "minutes": 10,
        "emoji": "🧼",
        "for_level": [1, 2, 3],
        "skills": ["Hygiene habits", "Following steps"],
        "steps": [
            "Sing the handwash song.",
            "Practise the 6 steps at the tap.",
            "Give a star sticker for every step done.",
        ],
    },
]

SEED_CHILDREN = [
    {
        "id": "aarav",
        "name": "Aarav",
        "age": 4,
        "avatar": "👦🏽",
        "tone": "teal",
        "scores": {"alphabet": 1, "numbers": 2, "colours": 3, "art": 2, "stories": 2},
        "strengths": ["Recognises basic colours", "Sorts shapes confidently"],
        "needs": ["Alphabet recognition", "Letter sounds"],
    },
    {
        "id": "anaya",
        "name": "Anaya",
        "age": 4,
        "avatar": "👧🏽",
        "tone": "coral",
        "scores": {"alphabet": 3, "numbers": 1, "colours": 2, "art": 3, "stories": 2},
        "strengths": ["Knows letters A–J", "Loves drawing activities"],
        "needs": ["Counting beyond 5", "Number recognition"],
    },
    {
        "id": "vihaan",
        "name": "Vihaan",
        "age": 3,
        "avatar": "🧒🏽",
        "tone": "sun",
        "scores": {"alphabet": 2, "numbers": 2, "colours": 1, "art": 1, "stories": 2},
        "strengths": ["Listens well during stories"],
        "needs": ["Colour names", "Holding crayons"],
    },
    {
        "id": "diya",
        "name": "Diya",
        "age": 5,
        "avatar": "👧🏾",
        "tone": "sky",
        "scores": {"alphabet": 3, "numbers": 3, "colours": 3, "art": 2, "stories": 3},
        "strengths": ["Counts to 10", "Tells stories with pictures", "Recognises most letters"],
        "needs": ["Patience during art"],
    },
    {
        "id": "kabir",
        "name": "Kabir",
        "age": 4,
        "avatar": "👦🏾",
        "tone": "primary",
        "scores": {"alphabet": 2, "numbers": 3, "colours": 2, "art": 2, "stories": 1},
        "strengths": ["Counts objects accurately"],
        "needs": ["Speaking in a group", "Following routines"],
    },
    {
        "id": "saanvi",
        "name": "Saanvi",
        "age": 3,
        "avatar": "👧🏻",
        "tone": "teal",
        "scores": {"alphabet": 1, "numbers": 1, "colours": 2, "art": 3, "stories": 2},
        "strengths": ["Very creative with colours", "Participates in drawing"],
        "needs": ["Alphabet recognition", "Counting 1–5"],
    },
    {
        "id": "arjun",
        "name": "Arjun",
        "age": 5,
        "avatar": "👦🏻",
        "tone": "sun",
        "scores": {"alphabet": 2, "numbers": 2, "colours": 3, "art": 3, "stories": 3},
        "strengths": ["Knows shapes", "Helps friends", "Follows handwash routine"],
        "needs": ["Letter formation"],
    },
    {
        "id": "meera",
        "name": "Meera",
        "age": 4,
        "avatar": "👧🏽",
        "tone": "coral",
        "scores": {"alphabet": 2, "numbers": 1, "colours": 1, "art": 2, "stories": 3},
        "strengths": ["Enjoys songs and games"],
        "needs": ["Number recognition", "Colour names"],
    },
    {
        "id": "rohan",
        "name": "Rohan",
        "age": 3,
        "avatar": "🧒🏾",
        "tone": "sky",
        "scores": {"alphabet": 1, "numbers": 2, "colours": 2, "art": 1, "stories": 1},
        "strengths": ["Curious and energetic"],
        "needs": ["Alphabet recognition", "Sitting for stories"],
    },
]

SEED_OBSERVATIONS = [
    {
        "id": "o1",
        "child_id": "aarav",
        "domain": "alphabet",
        "activity_id": "alphabet-match",
        "score": 1,
        "note": "Recognised A and B but needed help with C, D and E.",
        "date": days_ago(3),
    },
    {
        "id": "o2",
        "child_id": "anaya",
        "domain": "numbers",
        "activity_id": "count-match",
        "score": 1,
        "note": "Counted up to 4 correctly, then lost track.",
        "date": days_ago(2),
    },
    {
        "id": "o3",
        "child_id": "diya",
        "domain": "numbers",
        "activity_id": "bead-counting",
        "score": 3,
        "note": "Threaded 10 beads and counted aloud without help.",
        "date": days_ago(2),
    },
    {
        "id": "o4",
        "child_id": "vihaan",
        "domain": "colours",
        "activity_id": "colour-hunt",
        "score": 1,
        "note": "Found red objects but mixed up blue and green.",
        "date": days_ago(1),
    },
    {
        "id": "o5",
        "child_id": "saanvi",
        "domain": "art",
        "activity_id": "leaf-painting",
        "score": 3,
        "note": "Made beautiful prints, explained the colours she chose.",
        "date": days_ago(1),
    },
    {
        "id": "o6",
        "child_id": "kabir",
        "domain": "stories",
        "activity_id": "story-circle",
        "score": 1,
        "note": "Listened quietly but did not answer questions yet.",
        "date": days_ago(4),
    },
]

def date_key(d: datetime.date) -> str:
    return d.strftime("%Y-%m-%d")

def seed_attendance(children, target_date: datetime.date = None):
    if target_date is None:
        target_date = datetime.date.today()
    records = []
    for ci, ch in enumerate(children):
        # Past working days of current month up to yesterday
        for d in range(1, target_date.day):
            dt = datetime.date(target_date.year, target_date.month, d)
            if dt.weekday() == 6:  # Skip Sunday
                continue
            is_present = ((d * 7 + ci * 3) % 10) > (2 if (ci % 3 == 2) else 0)
            records.append({
                "child_id": ch["id"],
                "date": date_key(dt),
                "present": bool(is_present),
            })
        # Today
        records.append({
            "child_id": ch["id"],
            "date": date_key(target_date),
            "present": bool(ci != 2 and ci != 7),
        })
    return records
