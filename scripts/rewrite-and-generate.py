#!/usr/bin/env python3
"""
The Concord — Character Race/Gender Rewrite + Portrait Regeneration

Reassigns all 500 characters with a market-focused racial distribution:
  White/Western European:  44%  (220 chars)
  East Asian:              19%  (95 chars)
  Latin American:          13%  (65 chars)
  Black/African:           11%  (55 chars)
  South Asian:              7%  (35 chars)
  MENA:                     4%  (20 chars)
  Southeast Asian:          2%  (10 chars)

Gender: 65% male, 35% female — research-backed for adventure MMO genre

Portraits for characters whose race changes are deleted and regenerated.
Portraits for characters staying Black are kept (skipped).
"""

import csv, json, os, re, time, urllib.request, urllib.error
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────

FAL_API_KEY = os.environ.get(
    "FAL_AI_API_KEY",
    "553b4624-3af5-4e45-9adc-2a8e385eea85:f4f9eaeb72e127d10cb0ceaf77615520"
)
FAL_SUBMIT_URL = "https://queue.fal.run/fal-ai/flux-pro/v1.1"

BASE_DIR = Path(__file__).parent.parent
GAME_BIBLE_DIR = BASE_DIR / "docs" / "game-bible"
OUTPUT_DIR = BASE_DIR / "docs" / "character-references"
MANIFEST_PATH = BASE_DIR / "docs" / "character-manifest.json"
BRIEF_PATH = BASE_DIR / "docs" / "CHARACTER-DESIGN-BRIEF.md"

IMAGE_WIDTH = 768
IMAGE_HEIGHT = 1024
NUM_STEPS = 28

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ─── Ethnic Profile Library ────────────────────────────────────────────────────

# ─── Unified 500-character assignment lists (seed 42 race, seed 44 gender) ────
# Target: White 44% | East Asian 19% | Latin 13% | Black 11% | South Asian 7% | MENA 4% | SE Asian 2%
# Gender: 65% male, 35% female — research-backed for adventure MMO genre

_WHITE   = ["British","German","French","Scandinavian","Italian","Spanish","Polish","Dutch","Irish","Portuguese","Greek","Austrian"]
_EAST_A  = ["Japanese","Korean","Chinese"]
_SOUTH_A = ["Indian_North","Indian_South","Pakistani"]
_SE_A    = ["Filipino","Indonesian"]
_LATIN   = ["Brazilian","Mexican","Colombian","Argentine"]
_MENA    = ["Arab","Iranian"]
_BLACK   = ["Nigerian_Yoruba","Nigerian_Igbo","Ghanaian","Kenyan","South_African","Ethiopian","Cameroonian","Senegalese","Caribbean_Black","African_American"]

BLACK_GROUPS = set(_BLACK)

def _build_race_list_500():
    import random
    groups = (
        [_WHITE[i%len(_WHITE)]     for i in range(220)] +
        [_EAST_A[i%len(_EAST_A)]  for i in range(95)]  +
        [_SOUTH_A[i%len(_SOUTH_A)] for i in range(35)] +
        [_SE_A[i%len(_SE_A)]      for i in range(10)]  +
        [_LATIN[i%len(_LATIN)]    for i in range(65)]  +
        [_MENA[i%len(_MENA)]      for i in range(20)]  +
        [_BLACK[i%len(_BLACK)]    for i in range(55)]
    )
    random.seed(42); random.shuffle(groups)
    return groups

def _build_gender_list_500():
    import random
    g = ['male']*325 + ['female']*175
    random.seed(44); random.shuffle(g)
    return g

ETHNIC_ASSIGNMENTS_500 = _build_race_list_500()   # 500 entries
GENDER_ASSIGNMENTS_500 = _build_gender_list_500()  # 500 entries

# Visual descriptors per ethnic group
PROFILES = {
    "British": {
        "f": "British woman of English-Irish heritage",
        "m": "British man of English-Irish heritage",
        "skin_f": "fair complexion, light freckles",
        "skin_m": "fair complexion",
        "hair_f": ["auburn hair worn in a practical style",
                   "light brown hair pulled back",
                   "dark blonde hair neatly arranged",
                   "chestnut brown hair"],
        "hair_m": ["short brown hair", "neatly cropped dark hair"],
        "eyes": ["green eyes", "hazel eyes", "grey-blue eyes", "pale blue eyes"],
    },
    "German": {
        "f": "German woman of Central European heritage",
        "m": "German man of Central European heritage",
        "skin_f": "fair skin, clear Northern European complexion",
        "skin_m": "fair skin, angular Northern European features",
        "hair_f": ["light brown hair worn severe and controlled",
                   "ash blonde hair in a structured arrangement",
                   "dark brown hair precisely styled"],
        "hair_m": ["short blond hair", "cropped dark brown hair"],
        "eyes": ["pale blue eyes", "grey eyes", "light brown eyes"],
    },
    "French": {
        "f": "French woman of Western European heritage",
        "m": "French man of Western European heritage",
        "skin_f": "light olive skin, refined Southern French features",
        "skin_m": "light olive skin, sharp refined features",
        "hair_f": ["dark brown hair worn loosely elegant",
                   "chestnut hair styled with Gallic ease"],
        "hair_m": ["dark hair worn short", "wavy dark brown hair"],
        "eyes": ["dark brown eyes", "hazel eyes", "deep grey eyes"],
    },
    "Scandinavian": {
        "f": "Scandinavian woman of Nordic heritage",
        "m": "Scandinavian man of Nordic heritage",
        "skin_f": "very fair skin, clean Nordic features",
        "skin_m": "very fair skin, strong Nordic bone structure",
        "hair_f": ["platinum blonde hair worn in a neat updo",
                   "silver-blonde hair worn short and precise",
                   "white-blonde hair cropped close"],
        "hair_m": ["short blonde hair", "silver-grey cropped hair"],
        "eyes": ["pale blue eyes", "ice-grey eyes", "clear grey-green eyes"],
    },
    "Italian": {
        "f": "Italian woman of Mediterranean heritage",
        "m": "Italian man of Mediterranean heritage",
        "skin_f": "warm olive skin, dark Mediterranean features",
        "skin_m": "warm olive skin, strong Mediterranean jawline",
        "hair_f": ["dark brown hair worn in a loose elegant arrangement",
                   "black hair styled with Southern European ease"],
        "hair_m": ["dark brown hair worn short", "black hair neatly trimmed"],
        "eyes": ["dark brown eyes", "warm hazel eyes", "deep amber eyes"],
    },
    "Spanish": {
        "f": "Spanish woman of Iberian heritage",
        "m": "Spanish man of Iberian heritage",
        "skin_f": "warm olive complexion, dark Iberian features",
        "skin_m": "warm olive complexion, strong defined features",
        "hair_f": ["dark brown hair worn in a controlled knot",
                   "black hair neatly arranged"],
        "hair_m": ["short dark hair", "close-cropped black hair"],
        "eyes": ["dark brown eyes", "deep hazel eyes"],
    },
    "Polish": {
        "f": "Polish woman of Eastern European heritage",
        "m": "Polish man of Eastern European heritage",
        "skin_f": "fair skin, Slavic bone structure",
        "skin_m": "fair skin, strong Slavic features",
        "hair_f": ["dark blonde hair worn practical",
                   "medium brown hair in a controlled style"],
        "hair_m": ["short dark blonde hair", "brown hair cropped practical"],
        "eyes": ["grey-blue eyes", "blue eyes", "light hazel eyes"],
    },
    "Dutch": {
        "f": "Dutch woman of Northern European heritage",
        "m": "Dutch man of Northern European heritage",
        "skin_f": "fair complexion, tall Northern European build",
        "skin_m": "fair complexion, direct Northern European bearing",
        "hair_f": ["blonde hair worn in a neat practical arrangement",
                   "light brown hair controlled"],
        "hair_m": ["short blonde hair", "light brown hair cropped neat"],
        "eyes": ["blue eyes", "grey eyes", "green eyes"],
    },
    "Irish": {
        "f": "Irish woman of Celtic heritage",
        "m": "Irish man of Celtic heritage",
        "skin_f": "fair skin with light freckles, Celtic colouring",
        "skin_m": "fair skin, Celtic features",
        "hair_f": ["auburn hair worn loosely", "red-brown hair in a practical style"],
        "hair_m": ["short auburn hair", "red-brown hair cropped"],
        "eyes": ["green eyes", "grey-green eyes", "pale blue eyes"],
    },
    "Portuguese": {
        "f": "Portuguese woman of Iberian heritage",
        "m": "Portuguese man of Iberian heritage",
        "skin_f": "warm olive skin, dark Lusophone features",
        "skin_m": "warm olive skin, defined Mediterranean features",
        "hair_f": ["dark brown hair worn in a loose arrangement",
                   "black hair neatly styled"],
        "hair_m": ["dark hair short", "black hair close-cropped"],
        "eyes": ["dark brown eyes", "warm hazel eyes"],
    },
    "Greek": {
        "f": "Greek woman of Mediterranean heritage",
        "m": "Greek man of Mediterranean heritage",
        "skin_f": "warm olive skin, classic Mediterranean features",
        "skin_m": "warm olive skin, strong classical features",
        "hair_f": ["dark brown hair worn loose",
                   "black hair in an elegant arrangement"],
        "hair_m": ["short dark hair", "black hair close"],
        "eyes": ["dark brown eyes", "hazel eyes", "warm amber eyes"],
    },
    "Austrian": {
        "f": "Austrian woman of Central European heritage",
        "m": "Austrian man of Central European heritage",
        "skin_f": "fair skin, precise Central European features",
        "skin_m": "fair skin, composed Central European bearing",
        "hair_f": ["dark brown hair in a controlled arrangement",
                   "light brown hair precisely styled"],
        "hair_m": ["short brown hair", "dark hair neatly cropped"],
        "eyes": ["grey eyes", "pale blue eyes", "light hazel eyes"],
    },
    "Japanese": {
        "f": "Japanese woman",
        "m": "Japanese man",
        "skin_f": "light warm skin, precise East Asian features",
        "skin_m": "light warm skin, defined East Asian features",
        "hair_f": ["black hair worn in a precise updo",
                   "straight black hair pulled back severely",
                   "black hair in a controlled elegant arrangement"],
        "hair_m": ["short straight black hair", "black hair neatly parted"],
        "eyes": ["dark brown eyes", "very dark eyes with composed precision"],
    },
    "Korean": {
        "f": "Korean woman",
        "m": "Korean man",
        "skin_f": "light skin, clean East Asian features",
        "skin_m": "light skin, composed East Asian features",
        "hair_f": ["straight black hair worn in a sleek arrangement",
                   "dark brown hair styled precisely"],
        "hair_m": ["short black hair", "dark hair close-cropped"],
        "eyes": ["dark brown eyes", "very dark composed eyes"],
    },
    "Chinese": {
        "f": "Chinese woman",
        "m": "Chinese man",
        "skin_f": "warm light skin, refined East Asian features",
        "skin_m": "warm light skin, composed East Asian features",
        "hair_f": ["straight black hair in a practical arrangement",
                   "dark hair worn neatly up"],
        "hair_m": ["short black hair", "close-cropped dark hair"],
        "eyes": ["dark brown eyes", "calm dark eyes"],
    },
    "Indian_North": {
        "f": "Indian woman of North Indian heritage",
        "m": "Indian man of North Indian heritage",
        "skin_f": "warm medium skin, North Indian features",
        "skin_m": "warm medium-brown skin, strong North Indian features",
        "hair_f": ["black hair worn in a long braid or updo",
                   "dark brown hair in a structured arrangement"],
        "hair_m": ["short dark hair", "black hair neat"],
        "eyes": ["dark brown eyes", "warm amber-brown eyes"],
    },
    "Indian_South": {
        "f": "Indian woman of South Indian heritage",
        "m": "Indian man of South Indian heritage",
        "skin_f": "warm brown skin, South Indian features",
        "skin_m": "warm brown skin, strong South Indian features",
        "hair_f": ["black hair in a traditional arrangement",
                   "long dark hair worn up"],
        "hair_m": ["short black hair", "dark hair close"],
        "eyes": ["deep dark brown eyes", "warm dark eyes"],
    },
    "Pakistani": {
        "f": "Pakistani woman of South Asian heritage",
        "m": "Pakistani man of South Asian heritage",
        "skin_f": "warm medium skin, South Asian features",
        "skin_m": "warm medium skin, defined South Asian features",
        "hair_f": ["dark hair worn in a controlled style",
                   "black hair in a neat arrangement"],
        "hair_m": ["short dark hair", "black hair cropped"],
        "eyes": ["dark brown eyes", "warm hazel-brown eyes"],
    },
    "Filipino": {
        "f": "Filipino woman of Southeast Asian heritage",
        "m": "Filipino man of Southeast Asian heritage",
        "skin_f": "warm light-brown skin, Southeast Asian features",
        "skin_m": "warm light-brown skin, composed Southeast Asian features",
        "hair_f": ["straight black hair worn practical",
                   "dark hair in a neat arrangement"],
        "hair_m": ["short black hair", "dark hair close-cropped"],
        "eyes": ["dark brown eyes", "warm dark eyes"],
    },
    "Indonesian": {
        "f": "Indonesian woman of Southeast Asian heritage",
        "m": "Indonesian man of Southeast Asian heritage",
        "skin_f": "warm golden-brown skin, Malay-Javanese features",
        "skin_m": "warm golden-brown skin, composed Javanese features",
        "hair_f": ["black hair in a practical updo",
                   "straight dark hair worn back"],
        "hair_m": ["short black hair", "dark hair neat"],
        "eyes": ["dark warm brown eyes", "deep brown eyes"],
    },
    "Brazilian": {
        "f": "Brazilian woman of mixed Portuguese-South American heritage",
        "m": "Brazilian man of mixed Portuguese-South American heritage",
        "skin_f": "warm light-olive skin, Brazilian mixed heritage features",
        "skin_m": "warm olive skin, Brazilian features",
        "hair_f": ["dark wavy hair worn in a practical arrangement",
                   "brown hair with natural wave, worn loose"],
        "hair_m": ["dark wavy hair short", "brown hair cropped practical"],
        "eyes": ["warm brown eyes", "hazel eyes", "dark amber eyes"],
    },
    "Mexican": {
        "f": "Mexican woman of Mestizo heritage",
        "m": "Mexican man of Mestizo heritage",
        "skin_f": "warm medium-olive skin, Mestizo features",
        "skin_m": "warm medium skin, strong Mestizo features",
        "hair_f": ["dark brown hair in a neat arrangement",
                   "black hair worn practical"],
        "hair_m": ["dark hair cropped", "short black hair"],
        "eyes": ["dark brown eyes", "warm hazel eyes"],
    },
    "Colombian": {
        "f": "Colombian woman of mixed Latin American heritage",
        "m": "Colombian man of mixed Latin American heritage",
        "skin_f": "warm olive skin, Latin American features",
        "skin_m": "warm olive skin, composed Latin features",
        "hair_f": ["dark brown hair worn in a practical style",
                   "black hair arranged neatly"],
        "hair_m": ["dark hair short", "black hair close"],
        "eyes": ["dark brown eyes", "warm hazel-brown eyes"],
    },
    "Argentine": {
        "f": "Argentine woman of Southern European-South American heritage",
        "m": "Argentine man of Southern European-South American heritage",
        "skin_f": "light olive skin, Rioplatense features",
        "skin_m": "light olive skin, composed Rioplatense bearing",
        "hair_f": ["dark brown hair worn loose and practical",
                   "light brown hair in a neat arrangement"],
        "hair_m": ["dark hair short", "brown hair cropped"],
        "eyes": ["brown eyes", "green-brown eyes", "hazel eyes"],
    },
    "Arab": {
        "f": "Arab woman of Levantine heritage",
        "m": "Arab man of Levantine heritage",
        "skin_f": "warm medium-olive skin, Levantine features",
        "skin_m": "warm olive skin, strong Levantine features",
        "hair_f": ["dark brown hair worn in a structured arrangement",
                   "black hair in a controlled elegant style"],
        "hair_m": ["short dark hair", "black hair neatly trimmed"],
        "eyes": ["dark brown eyes", "warm hazel eyes", "deep amber eyes"],
    },
    "Iranian": {
        "f": "Iranian woman of Persian heritage",
        "m": "Iranian man of Persian heritage",
        "skin_f": "warm olive skin, Persian features",
        "skin_m": "warm olive skin, strong Persian features",
        "hair_f": ["dark brown hair in a precise arrangement",
                   "black hair worn elegantly"],
        "hair_m": ["short dark hair", "black hair controlled"],
        "eyes": ["dark brown eyes", "green-hazel eyes", "warm amber eyes"],
    },
    "Nigerian_Yoruba": {
        "f": "Nigerian woman of Yoruba heritage",
        "m": "Nigerian man of Yoruba heritage",
        "skin_f": "deep warm brown skin, West African features",
        "skin_m": "deep brown skin, strong Yoruba features",
        "hair_f": ["natural black hair worn in a structured updo",
                   "close-cropped natural hair"],
        "hair_m": ["close-cropped black hair", "natural black hair neat"],
        "eyes": ["warm dark brown eyes", "very dark expressive eyes"],
    },
    "Nigerian_Igbo": {
        "f": "Nigerian woman of Igbo heritage",
        "m": "Nigerian man of Igbo heritage",
        "skin_f": "deep brown skin with warm undertone, West African features",
        "skin_m": "deep brown skin, strong Igbo features",
        "hair_f": ["natural black hair", "close-cropped natural hair"],
        "hair_m": ["close-cropped black hair", "natural short hair"],
        "eyes": ["dark brown eyes", "deep warm brown eyes"],
    },
    "Ghanaian": {
        "f": "Ghanaian woman",
        "m": "Ghanaian man",
        "skin_f": "rich deep brown skin, Ghanaian features",
        "skin_m": "rich deep brown skin, strong Ghanaian features",
        "hair_f": ["natural black hair in a neat arrangement",
                   "close-cropped natural hair"],
        "hair_m": ["close-cropped black hair"],
        "eyes": ["warm dark brown eyes"],
    },
    "Kenyan": {
        "f": "Kenyan woman of East African heritage",
        "m": "Kenyan man of East African heritage",
        "skin_f": "deep brown skin with cool undertone, East African features",
        "skin_m": "deep brown skin, lean East African features",
        "hair_f": ["natural black hair short", "close-cropped hair"],
        "hair_m": ["close-cropped black hair"],
        "eyes": ["very dark expressive eyes"],
    },
    "South_African": {
        "f": "South African woman",
        "m": "South African man",
        "skin_f": "deep warm brown skin, Southern African features",
        "skin_m": "deep brown skin, Southern African features",
        "hair_f": ["natural black hair", "close-cropped natural hair"],
        "hair_m": ["close-cropped black hair"],
        "eyes": ["warm dark brown eyes"],
    },
    "Ethiopian": {
        "f": "Ethiopian woman",
        "m": "Ethiopian man",
        "skin_f": "warm brown skin with rich undertone, East African features",
        "skin_m": "warm brown skin, refined East African features",
        "hair_f": ["natural black hair in a neat arrangement"],
        "hair_m": ["close-cropped black hair", "natural short hair"],
        "eyes": ["dark expressive eyes"],
    },
    "Cameroonian": {
        "f": "Cameroonian woman of Central African heritage",
        "m": "Cameroonian man of Central African heritage",
        "skin_f": "deep rich brown skin, Central African features",
        "skin_m": "deep brown skin, strong Central African features",
        "hair_f": ["natural black hair", "close-cropped hair"],
        "hair_m": ["close-cropped black hair"],
        "eyes": ["warm dark brown eyes"],
    },
    "Senegalese": {
        "f": "Senegalese woman of West African heritage",
        "m": "Senegalese man of West African heritage",
        "skin_f": "very deep rich brown skin, West African features",
        "skin_m": "very deep brown skin, strong West African features",
        "hair_f": ["natural black hair in a structured style"],
        "hair_m": ["close-cropped black hair"],
        "eyes": ["very dark expressive eyes"],
    },
    "Caribbean_Black": {
        "f": "Caribbean woman of Afro-Caribbean heritage",
        "m": "Caribbean man of Afro-Caribbean heritage",
        "skin_f": "warm deep brown skin, Caribbean features",
        "skin_m": "warm deep brown skin, Caribbean features",
        "hair_f": ["natural black coils in a practical arrangement"],
        "hair_m": ["close-cropped black hair"],
        "eyes": ["warm dark brown eyes"],
    },
    "African_American": {
        "f": "African-American woman",
        "m": "African-American man",
        "skin_f": "warm brown skin, African-American features",
        "skin_m": "warm brown skin, strong African-American features",
        "hair_f": ["natural black hair worn practical"],
        "hair_m": ["close-cropped black hair"],
        "eyes": ["warm dark brown eyes"],
    },
}

# ─── Prompt builder ────────────────────────────────────────────────────────────

def build_new_prompt(original_prompt: str, ethnic_key: str, gender: str, char_index: int) -> str:
    """
    Takes original Fal.ai prompt, extracts the costume/setting/lighting/background,
    and rebuilds with new ethnic/gender descriptors.
    """
    p = PROFILES[ethnic_key]
    g = gender  # "female" or "male"
    gk = "f" if g == "female" else "m"

    # Rotate through hair/eye options deterministically
    hair_options = p[f"hair_{gk}"]
    eye_options = p["eyes"]
    hair = hair_options[char_index % len(hair_options)]
    eyes = eye_options[char_index % len(eye_options)]
    skin = p[f"skin_{gk}"]
    ethnic_desc = p[gk]

    # Extract age from original prompt
    age_match = re.search(r"(\d+)-year-old", original_prompt)
    age_phrase = f"{age_match.group(1)}-year-old" if age_match else "mature"

    # Extract costume/role section — everything after the opening physical description
    # Look for first mention of "wears", "wear", "uniform", "coat", "robe", "dress", "suit"
    costume_match = re.search(
        r"((?:She|He|They)\s+wears?|(?:wears?|wearing|dressed\s+in|in\s+(?:a|an|the|full|dark|deep|formal|field))\s+)",
        original_prompt, re.IGNORECASE
    )

    # Extract background
    bg_match = re.search(r"Background:\s*(.+?)\.?\s*$", original_prompt, re.DOTALL)
    background = bg_match.group(1).strip() if bg_match else "neutral dramatic background"

    # Extract lighting
    lighting_match = re.search(
        r"((?:warm|cold|cool|soft|harsh|clinical|neutral|directional|overhead|natural|formal|"
        r"survey|military|monastery|fluorescent|amber|cinematic)\s+(?:lighting|light|directional[^.]*|"
        r"overhead[^.]*|studio[^.]*))",
        original_prompt, re.IGNORECASE
    )
    lighting = lighting_match.group(1).strip() if lighting_match else "cinematic directional lighting"

    # Extract narrative context sentence (usually mentions the character's role/secret)
    # It often appears after the costume description
    if costume_match:
        after_costume = original_prompt[costume_match.start():]
        # Get sentences that contain narrative (not pure physical description)
        narrative_sentences = []
        for sent in re.split(r'(?<=[.!?])\s+', after_costume):
            sent = sent.strip()
            if sent and not re.match(r'^(Photorealistic|Ultra-realistic|Background|The lighting)', sent, re.IGNORECASE):
                if len(sent) > 30:
                    narrative_sentences.append(sent)
        # Take up to 3 narrative sentences
        narrative = ' '.join(narrative_sentences[:3])
    else:
        # Fall back: take middle portion of original prompt
        sentences = re.split(r'(?<=[.!?])\s+', original_prompt)
        narrative = ' '.join(sentences[2:min(6, len(sentences))])

    # Construct new prompt
    prompt = (
        f"Full-body portrait of a {age_phrase} {ethnic_desc}. "
        f"{skin.capitalize()}. "
        f"{hair.capitalize()}. {eyes.capitalize()}. "
        f"{narrative} "
        f"Photorealistic. {lighting.capitalize()}. Background: {background}."
    )

    # Clean up double spaces
    prompt = re.sub(r'\s{2,}', ' ', prompt).strip()
    return prompt


# ─── Bible parsers ─────────────────────────────────────────────────────────────

def slug(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')[:60]


def parse_vol1_csv():
    csv_path = GAME_BIBLE_DIR / "The_Concord_Character_Visual_Manifest_Vol1.csv"
    characters = []
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = row.get('character_id', '').strip()
            name = row.get('name_display', '').strip()
            title = row.get('name_title', '').strip()
            tier = row.get('tier', '').strip()
            faction = row.get('faction', '').strip()
            age = row.get('age_approx', '').strip()
            prompt = row.get('gemini_image_prompt', '').strip()
            if cid and name and prompt:
                display = f"{title} {name}".strip() if title else name
                characters.append({
                    'id': cid, 'name': display, 'tier': tier,
                    'faction': faction, 'age': age, 'original_prompt': prompt,
                    'slug': slug(name),
                })
    return characters


def parse_md_bible(path: Path):
    text = path.read_text(encoding='utf-8')
    characters = []
    sections = re.split(r'\n(?=###\s+)', text)
    for section in sections:
        hm = re.match(r'###\s+(E-\d+|\d+)\s+[·•·]\s+(.+?)(?:\s*\n|$)', section, re.IGNORECASE)
        if not hm:
            continue
        char_id = hm.group(1).strip()
        raw_name = hm.group(2).strip()
        tier_m = re.search(r'\*\*Tier:\*\*\s*(.+?)(?:\s*\n|$)', section)
        faction_m = re.search(r'\*\*Faction:\*\*\s*(.+?)(?:\s*\n|$)', section)
        age_m = re.search(r'\*\*Age:\*\*\s*(.+?)(?:\s*\n|$)', section)
        gemini_m = re.search(
            r'>\s*\*\*Gemini:\*\*\s*(.+?)(?=\n>\s*\*\*Grok|\n\n---|\n\n###|\Z)',
            section, re.DOTALL
        )
        if not gemini_m:
            continue
        prompt = re.sub(r'\s+', ' ', gemini_m.group(1)).strip()
        characters.append({
            'id': char_id,
            'name': raw_name,
            'tier': tier_m.group(1).strip() if tier_m else '',
            'faction': faction_m.group(1).strip() if faction_m else '',
            'age': age_m.group(1).strip() if age_m else '',
            'original_prompt': prompt,
            'slug': slug(raw_name),
        })
    return characters


# ─── Fal.ai API ────────────────────────────────────────────────────────────────

def api_post(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Key {FAL_API_KEY}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, {}


def api_get(url):
    req = urllib.request.Request(url, headers={"Authorization": f"Key {FAL_API_KEY}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, {}


def generate_one(char_id: str, char_slug: str, prompt: str) -> tuple:
    out_path = OUTPUT_DIR / f"{char_id}-{char_slug}.jpg"
    if out_path.exists():
        print(f"  [skip] {out_path.name}")
        return str(out_path), None

    payload = {
        "prompt": prompt,
        "image_size": {"width": IMAGE_WIDTH, "height": IMAGE_HEIGHT},
        "num_inference_steps": NUM_STEPS,
        "num_images": 1,
        "output_format": "jpeg",
    }

    status, resp = api_post(FAL_SUBMIT_URL, payload)
    if status == 402:
        return None, "CREDIT_LIMIT"
    if status == 403:
        body = resp.get("detail", "")
        if "Exhausted" in str(body) or "locked" in str(body):
            return None, "CREDIT_LIMIT"
        return None, f"HTTP 403: {body}"
    if status not in (200, 201, 202):
        return None, f"Submit failed HTTP {status}"

    status_url = resp.get("status_url")
    result_url = resp.get("response_url")
    if not status_url:
        return None, f"No status_url in response"

    for _ in range(120):
        time.sleep(3)
        s, poll = api_get(status_url)
        if s not in (200, 202):
            return None, f"Poll failed HTTP {s}"
        current = poll.get("status", "UNKNOWN")
        if current in ("COMPLETED", "SUCCESS"):
            break
        if current in ("FAILED", "ERROR"):
            return None, f"Generation failed"

    s, result = api_get(result_url)
    if s not in (200, 201):
        return None, f"Result fetch failed HTTP {s}"

    images = result.get("images") or []
    if not images:
        return None, "No images in result"

    img_url = images[0].get("url") or images[0].get("content_url")
    if not img_url:
        return None, "No url in image"

    img_req = urllib.request.Request(img_url)
    with urllib.request.urlopen(img_req, timeout=60) as img_resp:
        with open(out_path, "wb") as f:
            f.write(img_resp.read())

    return str(out_path), None


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=== The Concord — Race/Gender Rewrite + Generation ===\n")

    # 1. Load all characters
    print("Loading character bibles...")
    chars = parse_vol1_csv()
    for fname, label in [
        ("CANONICAL_CHARACTER_BIBLE.md", "Canonical"),
    ]:
        p = GAME_BIBLE_DIR / fname
        if p.exists():
            parsed = parse_md_bible(p)
            chars.extend(parsed)

    # Deduplicate
    seen = set()
    unique = []
    for c in chars:
        if c['id'] not in seen:
            seen.add(c['id'])
            unique.append(c)
    chars = unique
    print(f"  Total characters: {len(chars)}")

    # 2. Assign ethnicity + gender deterministically
    print("\nAssigning new ethnic/gender profiles...")
    for i, c in enumerate(chars):
        ethnic_key = ETHNIC_ASSIGNMENTS_500[i] if i < len(ETHNIC_ASSIGNMENTS_500) else ETHNIC_ASSIGNMENTS_500[i % 500]
        gender = GENDER_ASSIGNMENTS_500[i] if i < len(GENDER_ASSIGNMENTS_500) else GENDER_ASSIGNMENTS_500[i % 500]
        c['ethnic_key'] = ethnic_key
        c['gender'] = gender
        c['is_black'] = ethnic_key in BLACK_GROUPS
        c['new_prompt'] = build_new_prompt(c['original_prompt'], ethnic_key, gender, i)

    total = len(chars)
    black_count  = sum(1 for c in chars if c['is_black'])
    white_count  = sum(1 for c in chars if c['ethnic_key'] in set(_WHITE))
    east_a_count = sum(1 for c in chars if c['ethnic_key'] in set(_EAST_A))
    south_a_count= sum(1 for c in chars if c['ethnic_key'] in set(_SOUTH_A))
    se_a_count   = sum(1 for c in chars if c['ethnic_key'] in set(_SE_A))
    latin_count  = sum(1 for c in chars if c['ethnic_key'] in set(_LATIN))
    mena_count   = sum(1 for c in chars if c['ethnic_key'] in set(_MENA))
    male_count   = sum(1 for c in chars if c['gender'] == 'male')
    female_count = total - male_count

    print(f"  White/Western:    {white_count} ({white_count/total*100:.0f}%)  target 44%")
    print(f"  East Asian:       {east_a_count} ({east_a_count/total*100:.0f}%)  target 19%")
    print(f"  Latin American:   {latin_count} ({latin_count/total*100:.0f}%)  target 13%")
    print(f"  Black/African:    {black_count} ({black_count/total*100:.0f}%)  target 11%")
    print(f"  South Asian:      {south_a_count} ({south_a_count/total*100:.0f}%)  target 7%")
    print(f"  MENA:             {mena_count} ({mena_count/total*100:.0f}%)  target 4%")
    print(f"  SE Asian:         {se_a_count} ({se_a_count/total*100:.0f}%)  target 2%")
    print(f"  Male: {male_count} ({male_count/total*100:.0f}%)  Female: {female_count} ({female_count/total*100:.0f}%)  target 65/35%")

    # 3. Save manifest
    manifest = {}
    for c in chars:
        manifest[c['id']] = {
            'name': c['name'],
            'tier': c['tier'],
            'faction': c['faction'],
            'ethnic_key': c['ethnic_key'],
            'gender': c['gender'],
            'is_black': c['is_black'],
            'slug': c['slug'],
            'prompt': c['new_prompt'],
        }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"\nManifest saved: {MANIFEST_PATH}")

    # 4. Delete only stale portraits (filenames that no longer correspond to any character
    #    in the current manifest). Portraits already at the correct new filename are kept.
    expected_names = {f"{c['id']}-{c['slug']}.jpg" for c in chars}
    deleted = 0
    kept_black = 0
    kept_current = 0
    for portrait in sorted(OUTPUT_DIR.glob("*.jpg")):
        if portrait.name in expected_names:
            # Portrait already has the correct new filename — keep it
            c = next((x for x in chars if f"{x['id']}-{x['slug']}.jpg" == portrait.name), None)
            if c and c['is_black']:
                kept_black += 1
                print(f"  [keep Black] {portrait.name}")
            else:
                kept_current += 1
        else:
            portrait.unlink()
            deleted += 1
            print(f"  [delete stale] {portrait.name}")
    print(f"\nDeleted {deleted} stale portraits. Kept {kept_black} Black + {kept_current} current.")

    # 5. Generate all missing portraits
    pending = [c for c in chars if not (OUTPUT_DIR / f"{c['id']}-{c['slug']}.jpg").exists()]
    print(f"\nGenerating {len(pending)} portraits...")

    success = 0
    failures = []

    for i, c in enumerate(pending, 1):
        print(f"\n[{i}/{len(pending)}] {c['id']} · {c['name']} [{c['ethnic_key']}, {c['gender']}]")
        path, err = generate_one(c['id'], c['slug'], c['new_prompt'])
        if err == "CREDIT_LIMIT":
            print(f"  ⚠ Credit limit hit — stopping. {success} generated this run.")
            break
        elif err:
            print(f"  ✗ {err}")
            failures.append((c['id'], c['name'], err))
        else:
            print(f"  ✓ {path}")
            success += 1
        if i < len(pending):
            time.sleep(1)

    # 6. Update brief
    lines = [
        "# The Concord — Character Design Brief (Revised)",
        "",
        f"> Updated: 2026-03-18  Total: {total}",
        "",
        "## Racial Distribution",
        f"- White/Western: {white_count} ({white_count/total*100:.0f}%)  target 44%",
        f"- East Asian: {east_a_count} ({east_a_count/total*100:.0f}%)  target 19%",
        f"- Latin American: {latin_count} ({latin_count/total*100:.0f}%)  target 13%",
        f"- Black/African: {black_count} ({black_count/total*100:.0f}%)  target 11%",
        f"- South Asian: {south_a_count} ({south_a_count/total*100:.0f}%)  target 7%",
        f"- MENA: {mena_count} ({mena_count/total*100:.0f}%)  target 4%",
        f"- SE Asian: {se_a_count} ({se_a_count/total*100:.0f}%)  target 2%",
        f"\n## Gender: {male_count}M ({male_count/total*100:.0f}%) / {female_count}F ({female_count/total*100:.0f}%)  target 65/35%",
        "",
        "## Character Roster",
        "",
        "| ID | Name | Ethnicity | Gender | Status |",
        "|----|------|-----------|--------|--------|",
    ]
    for c in chars:
        portrait = OUTPUT_DIR / f"{c['id']}-{c['slug']}.jpg"
        status = "✅" if portrait.exists() else "⬜"
        lines.append(f"| {c['id']} | {c['name']} | {c['ethnic_key']} | {c['gender']} | {status} |")

    BRIEF_PATH.write_text('\n'.join(lines), encoding='utf-8')

    print(f"\n=== Done ===")
    print(f"  Generated: {success}")
    print(f"  Kept Black: {kept}")
    if failures:
        print(f"  Failures: {len(failures)}")


if __name__ == "__main__":
    main()
