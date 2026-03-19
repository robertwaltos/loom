#!/usr/bin/env python3
"""
The Concord — Canonical Character Rewrite
Rewrites all physical/visual descriptions across every document in the repo
to match the new ethnic/gender assignments (seed 42, same as rewrite-and-generate.py).

Files updated:
  - docs/game-bible/CANONICAL_CHARACTER_BIBLE.md
  - docs/game-bible/The_Concord_Character_Bible_Vol1.md  (Appearance: prose)
  - docs/game-bible/The_Concord_Character_Visual_Manifest_Vol1.csv
  - docs/CHARACTER-DESIGN-BRIEF.md  (regenerated)
"""

import csv, json, os, re, random
from pathlib import Path
from io import StringIO

BASE_DIR = Path(__file__).parent.parent
GAME_BIBLE_DIR = BASE_DIR / "docs" / "game-bible"
MANIFEST_PATH = BASE_DIR / "docs" / "character-manifest.json"
BRIEF_PATH = BASE_DIR / "docs" / "CHARACTER-DESIGN-BRIEF.md"

# ─── Ethnic assignment logic (identical to rewrite-and-generate.py) ────────────

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
    g = ['male']*325 + ['female']*175
    random.seed(44); random.shuffle(g)
    return g

ETHNIC_ASSIGNMENTS_500 = _build_race_list_500()   # 500 entries
GENDER_ASSIGNMENTS_500 = _build_gender_list_500()  # 500 entries

# ─── Visual profile library ────────────────────────────────────────────────────

PROFILES = {
    "British": {
        "f": "British woman of English-Irish heritage",
        "m": "British man of English-Irish heritage",
        "skin_f": "fair complexion, light freckles",
        "skin_m": "fair complexion",
        "skin_csv_f": "fair — light freckles across the nose",
        "skin_csv_m": "fair — even tone",
        "hair_f": ["auburn hair worn in a practical style","light brown hair pulled back",
                   "dark blonde hair neatly arranged","chestnut brown hair"],
        "hair_m": ["short brown hair","neatly cropped dark hair"],
        "hair_csv_f": ["auburn","light brown","dark blonde","chestnut"],
        "hair_csv_m": ["brown","dark brown"],
        "eyes": ["green eyes","hazel eyes","grey-blue eyes","pale blue eyes"],
        "eyes_csv": ["green","hazel","grey-blue","pale blue"],
        "ethnicity_csv": "Northern European — British-Irish synthesis",
        "heritage_phrase_f": "English-Irish heritage",
        "heritage_phrase_m": "English-Irish heritage",
    },
    "German": {
        "f": "German woman",
        "m": "German man",
        "skin_f": "fair complexion",
        "skin_m": "fair complexion",
        "skin_csv_f": "fair — cool undertone",
        "skin_csv_m": "fair — cool undertone",
        "hair_f": ["light blonde hair worn neat","medium blonde hair",
                   "dark blonde pulled back","straight brown hair"],
        "hair_m": ["short blonde hair","close-cropped brown hair"],
        "hair_csv_f": ["light blonde","medium blonde","dark blonde","brown"],
        "hair_csv_m": ["blonde","brown"],
        "eyes": ["blue eyes","grey eyes","pale green eyes","steel blue eyes"],
        "eyes_csv": ["blue","grey","pale green","steel blue"],
        "ethnicity_csv": "Central European — Germanic",
        "heritage_phrase_f": "German heritage",
        "heritage_phrase_m": "German heritage",
    },
    "French": {
        "f": "French woman",
        "m": "French man",
        "skin_f": "light complexion with warm undertone",
        "skin_m": "light complexion",
        "skin_csv_f": "light — warm golden undertone",
        "skin_csv_m": "light — warm undertone",
        "hair_f": ["dark brown hair worn loose","chestnut hair neatly pinned",
                   "dark hair in a practical chignon","warm brown hair"],
        "hair_m": ["dark brown hair","short brown hair"],
        "hair_csv_f": ["dark brown","chestnut","dark","warm brown"],
        "hair_csv_m": ["dark brown","brown"],
        "eyes": ["dark brown eyes","hazel eyes","warm brown eyes","amber eyes"],
        "eyes_csv": ["dark brown","hazel","warm brown","amber"],
        "ethnicity_csv": "Western European — French",
        "heritage_phrase_f": "French heritage",
        "heritage_phrase_m": "French heritage",
    },
    "Scandinavian": {
        "f": "Scandinavian woman of Nordic heritage",
        "m": "Scandinavian man of Nordic heritage",
        "skin_f": "very fair complexion",
        "skin_m": "very fair complexion",
        "skin_csv_f": "very fair — near-porcelain",
        "skin_csv_m": "very fair — cool undertone",
        "hair_f": ["platinum blonde hair worn practical","light blonde hair",
                   "ash blonde in a neat arrangement","white-blonde hair"],
        "hair_m": ["short platinum blonde","close-cropped light blonde"],
        "hair_csv_f": ["platinum blonde","light blonde","ash blonde","white-blonde"],
        "hair_csv_m": ["platinum blonde","light blonde"],
        "eyes": ["pale blue eyes","ice blue eyes","light grey eyes","clear blue eyes"],
        "eyes_csv": ["pale blue","ice blue","light grey","clear blue"],
        "ethnicity_csv": "Northern European — Nordic synthesis",
        "heritage_phrase_f": "Nordic heritage",
        "heritage_phrase_m": "Nordic heritage",
    },
    "Italian": {
        "f": "Italian woman",
        "m": "Italian man",
        "skin_f": "olive complexion with warm Mediterranean tone",
        "skin_m": "olive complexion",
        "skin_csv_f": "olive — warm Mediterranean",
        "skin_csv_m": "olive — warm Mediterranean",
        "hair_f": ["dark brown wavy hair worn loosely","black hair neatly arranged",
                   "deep brown hair","dark wavy hair pulled back"],
        "hair_m": ["dark brown hair","short black hair"],
        "hair_csv_f": ["dark brown","black","deep brown","dark brown wavy"],
        "hair_csv_m": ["dark brown","black"],
        "eyes": ["dark brown eyes","warm hazel eyes","deep amber eyes","chestnut brown eyes"],
        "eyes_csv": ["dark brown","warm hazel","deep amber","chestnut brown"],
        "ethnicity_csv": "Southern European — Italian",
        "heritage_phrase_f": "Italian heritage",
        "heritage_phrase_m": "Italian heritage",
    },
    "Spanish": {
        "f": "Spanish woman",
        "m": "Spanish man",
        "skin_f": "warm olive complexion",
        "skin_m": "warm olive complexion",
        "skin_csv_f": "warm olive — Mediterranean sun",
        "skin_csv_m": "warm olive — Mediterranean",
        "hair_f": ["black hair worn in a practical style","dark brown hair neat",
                   "rich brown hair","deep black hair"],
        "hair_m": ["short dark hair","close-cropped black hair"],
        "hair_csv_f": ["black","dark brown","rich brown","deep black"],
        "hair_csv_m": ["dark brown","black"],
        "eyes": ["dark brown eyes","deep amber eyes","warm brown eyes","hazel-brown eyes"],
        "eyes_csv": ["dark brown","deep amber","warm brown","hazel-brown"],
        "ethnicity_csv": "Southern European — Iberian",
        "heritage_phrase_f": "Spanish heritage",
        "heritage_phrase_m": "Spanish heritage",
    },
    "Polish": {
        "f": "Polish woman",
        "m": "Polish man",
        "skin_f": "fair complexion with cool undertone",
        "skin_m": "fair complexion",
        "skin_csv_f": "fair — cool Eastern European",
        "skin_csv_m": "fair — cool undertone",
        "hair_f": ["dark blonde hair worn neat","medium brown hair",
                   "light brown pulled back","ash brown hair"],
        "hair_m": ["short brown hair","close-cropped dark blonde"],
        "hair_csv_f": ["dark blonde","medium brown","light brown","ash brown"],
        "hair_csv_m": ["brown","dark blonde"],
        "eyes": ["blue-grey eyes","grey eyes","pale green eyes","slate blue eyes"],
        "eyes_csv": ["blue-grey","grey","pale green","slate blue"],
        "ethnicity_csv": "Eastern European — Polish",
        "heritage_phrase_f": "Polish heritage",
        "heritage_phrase_m": "Polish heritage",
    },
    "Dutch": {
        "f": "Dutch woman",
        "m": "Dutch man",
        "skin_f": "fair complexion",
        "skin_m": "fair complexion",
        "skin_csv_f": "fair — Northern European",
        "skin_csv_m": "fair — even tone",
        "hair_f": ["golden blonde hair worn practical","medium blonde",
                   "light brown neat","strawberry blonde"],
        "hair_m": ["short blonde hair","light brown short"],
        "hair_csv_f": ["golden blonde","medium blonde","light brown","strawberry blonde"],
        "hair_csv_m": ["blonde","light brown"],
        "eyes": ["blue eyes","clear blue eyes","grey-blue eyes","green eyes"],
        "eyes_csv": ["blue","clear blue","grey-blue","green"],
        "ethnicity_csv": "Northern European — Dutch",
        "heritage_phrase_f": "Dutch heritage",
        "heritage_phrase_m": "Dutch heritage",
    },
    "Irish": {
        "f": "Irish woman",
        "m": "Irish man",
        "skin_f": "very fair complexion with freckles",
        "skin_m": "fair complexion with light freckles",
        "skin_csv_f": "very fair — freckles",
        "skin_csv_m": "fair — light freckles",
        "hair_f": ["red-auburn hair worn loose","copper-red hair neat",
                   "dark auburn hair","warm red-brown hair"],
        "hair_m": ["red-brown hair short","auburn short cropped"],
        "hair_csv_f": ["red-auburn","copper-red","dark auburn","red-brown"],
        "hair_csv_m": ["red-brown","auburn"],
        "eyes": ["green eyes","blue-green eyes","pale blue eyes","hazel-green eyes"],
        "eyes_csv": ["green","blue-green","pale blue","hazel-green"],
        "ethnicity_csv": "Northern European — Irish-Celtic",
        "heritage_phrase_f": "Irish heritage",
        "heritage_phrase_m": "Irish heritage",
    },
    "Portuguese": {
        "f": "Portuguese woman",
        "m": "Portuguese man",
        "skin_f": "warm olive complexion",
        "skin_m": "warm olive complexion",
        "skin_csv_f": "warm olive — Southern Iberian",
        "skin_csv_m": "warm olive — Mediterranean",
        "hair_f": ["dark brown wavy hair","black hair neat","deep chestnut",
                   "dark hair in a practical style"],
        "hair_m": ["dark brown short","black short cropped"],
        "hair_csv_f": ["dark brown","black","deep chestnut","dark brown wavy"],
        "hair_csv_m": ["dark brown","black"],
        "eyes": ["dark brown eyes","warm brown eyes","deep hazel","amber brown"],
        "eyes_csv": ["dark brown","warm brown","deep hazel","amber brown"],
        "ethnicity_csv": "Southern European — Portuguese-Iberian",
        "heritage_phrase_f": "Portuguese heritage",
        "heritage_phrase_m": "Portuguese heritage",
    },
    "Greek": {
        "f": "Greek woman",
        "m": "Greek man",
        "skin_f": "warm olive-tan complexion",
        "skin_m": "warm olive complexion",
        "skin_csv_f": "warm olive-tan — Aegean",
        "skin_csv_m": "warm olive — Mediterranean",
        "hair_f": ["dark brown hair worn loose","black hair neatly arranged",
                   "deep black waves","rich dark brown"],
        "hair_m": ["dark brown short","black close-cropped"],
        "hair_csv_f": ["dark brown","black","deep black","rich dark brown"],
        "hair_csv_m": ["dark brown","black"],
        "eyes": ["dark brown eyes","warm hazel","deep brown","brown-black eyes"],
        "eyes_csv": ["dark brown","warm hazel","deep brown","brown-black"],
        "ethnicity_csv": "Southern European — Greek-Aegean",
        "heritage_phrase_f": "Greek heritage",
        "heritage_phrase_m": "Greek heritage",
    },
    "Austrian": {
        "f": "Austrian woman",
        "m": "Austrian man",
        "skin_f": "fair complexion",
        "skin_m": "fair complexion",
        "skin_csv_f": "fair — Central European",
        "skin_csv_m": "fair — cool undertone",
        "hair_f": ["light brown hair worn neat","medium brown straight",
                   "dark blonde arranged practical","warm brown"],
        "hair_m": ["brown short","dark blonde close-cropped"],
        "hair_csv_f": ["light brown","medium brown","dark blonde","warm brown"],
        "hair_csv_m": ["brown","dark blonde"],
        "eyes": ["blue eyes","grey-green eyes","hazel eyes","light brown eyes"],
        "eyes_csv": ["blue","grey-green","hazel","light brown"],
        "ethnicity_csv": "Central European — Austrian-Alpine",
        "heritage_phrase_f": "Austrian heritage",
        "heritage_phrase_m": "Austrian heritage",
    },
    "Japanese": {
        "f": "Japanese woman",
        "m": "Japanese man",
        "skin_f": "light even complexion with warm undertone",
        "skin_m": "light complexion with warm undertone",
        "skin_csv_f": "light — warm East Asian undertone",
        "skin_csv_m": "light — warm undertone",
        "hair_f": ["straight black hair worn practical","black hair neatly arranged",
                   "glossy black hair","black hair in a clean style"],
        "hair_m": ["short black hair","neatly trimmed black hair"],
        "hair_csv_f": ["straight black","black","glossy black","black neat"],
        "hair_csv_m": ["black short","black trimmed"],
        "eyes": ["dark brown eyes","deep brown eyes","warm dark eyes","black-brown eyes"],
        "eyes_csv": ["dark brown","deep brown","warm dark","black-brown"],
        "ethnicity_csv": "East Asian — Japanese",
        "heritage_phrase_f": "Japanese heritage",
        "heritage_phrase_m": "Japanese heritage",
    },
    "Korean": {
        "f": "Korean woman",
        "m": "Korean man",
        "skin_f": "light porcelain complexion with cool undertone",
        "skin_m": "light complexion with cool undertone",
        "skin_csv_f": "light porcelain — cool East Asian",
        "skin_csv_m": "light — cool undertone",
        "hair_f": ["straight black hair worn neat","glossy black hair",
                   "black hair in a clean arrangement","sleek black hair"],
        "hair_m": ["short black hair","close-cropped black hair"],
        "hair_csv_f": ["straight black","glossy black","black neat","sleek black"],
        "hair_csv_m": ["black short","black close-cropped"],
        "eyes": ["dark brown eyes","deep black-brown eyes","warm dark eyes","clear dark eyes"],
        "eyes_csv": ["dark brown","black-brown","warm dark","clear dark"],
        "ethnicity_csv": "East Asian — Korean",
        "heritage_phrase_f": "Korean heritage",
        "heritage_phrase_m": "Korean heritage",
    },
    "Chinese": {
        "f": "Chinese woman",
        "m": "Chinese man",
        "skin_f": "warm light complexion",
        "skin_m": "warm light complexion",
        "skin_csv_f": "light — warm East Asian",
        "skin_csv_m": "light — warm undertone",
        "hair_f": ["straight black hair worn practical","black hair pinned neat",
                   "glossy black hair","black hair arranged clean"],
        "hair_m": ["short black hair","neat dark hair"],
        "hair_csv_f": ["straight black","black neat","glossy black","black clean"],
        "hair_csv_m": ["black short","dark neat"],
        "eyes": ["dark brown eyes","warm brown eyes","deep brown eyes","black-brown eyes"],
        "eyes_csv": ["dark brown","warm brown","deep brown","black-brown"],
        "ethnicity_csv": "East Asian — Han Chinese",
        "heritage_phrase_f": "Chinese heritage",
        "heritage_phrase_m": "Chinese heritage",
    },
    "Indian_North": {
        "f": "North Indian woman",
        "m": "North Indian man",
        "skin_f": "warm golden-brown complexion",
        "skin_m": "warm brown complexion",
        "skin_csv_f": "warm golden-brown — North Indian",
        "skin_csv_m": "warm brown — North Indian",
        "hair_f": ["dark brown hair worn in a braid","black hair neatly arranged",
                   "deep brown hair","black hair in a practical knot"],
        "hair_m": ["dark hair short","black close-cropped"],
        "hair_csv_f": ["dark brown braid","black neat","deep brown","black knot"],
        "hair_csv_m": ["dark short","black close"],
        "eyes": ["dark brown eyes","warm hazel eyes","deep brown eyes","black-brown eyes"],
        "eyes_csv": ["dark brown","warm hazel","deep brown","black-brown"],
        "ethnicity_csv": "South Asian — North Indian",
        "heritage_phrase_f": "North Indian heritage",
        "heritage_phrase_m": "North Indian heritage",
    },
    "Indian_South": {
        "f": "South Indian woman",
        "m": "South Indian man",
        "skin_f": "rich warm brown complexion",
        "skin_m": "rich brown complexion",
        "skin_csv_f": "rich warm brown — South Indian Dravidian",
        "skin_csv_m": "rich brown — South Indian",
        "hair_f": ["black hair worn in a traditional style","dark black hair neat",
                   "glossy black hair","black hair in a practical arrangement"],
        "hair_m": ["short black hair","close-cropped black hair"],
        "hair_csv_f": ["black traditional","dark black neat","glossy black","black neat"],
        "hair_csv_m": ["black short","black close"],
        "eyes": ["dark brown eyes","deep brown eyes","warm dark eyes","black-brown eyes"],
        "eyes_csv": ["dark brown","deep brown","warm dark","black-brown"],
        "ethnicity_csv": "South Asian — South Indian Dravidian",
        "heritage_phrase_f": "South Indian heritage",
        "heritage_phrase_m": "South Indian heritage",
    },
    "Pakistani": {
        "f": "Pakistani woman",
        "m": "Pakistani man",
        "skin_f": "warm medium-brown complexion",
        "skin_m": "warm medium-brown complexion",
        "skin_csv_f": "warm medium brown — South Asian Pakistani",
        "skin_csv_m": "warm medium brown — South Asian",
        "hair_f": ["dark brown hair worn neat","black hair arranged practical",
                   "deep brown hair","black hair"],
        "hair_m": ["dark hair short","black close-cropped"],
        "hair_csv_f": ["dark brown","black neat","deep brown","black"],
        "hair_csv_m": ["dark short","black close"],
        "eyes": ["dark brown eyes","warm brown eyes","hazel-brown eyes","deep brown eyes"],
        "eyes_csv": ["dark brown","warm brown","hazel-brown","deep brown"],
        "ethnicity_csv": "South Asian — Pakistani",
        "heritage_phrase_f": "Pakistani heritage",
        "heritage_phrase_m": "Pakistani heritage",
    },
    "Filipino": {
        "f": "Filipino woman",
        "m": "Filipino man",
        "skin_f": "warm tan complexion with golden undertone",
        "skin_m": "warm tan complexion",
        "skin_csv_f": "warm tan — Filipino Southeast Asian",
        "skin_csv_m": "warm tan — Southeast Asian",
        "hair_f": ["black hair worn practical","dark brown hair neat",
                   "glossy black hair","black hair arranged clean"],
        "hair_m": ["short black hair","dark close-cropped hair"],
        "hair_csv_f": ["black practical","dark brown neat","glossy black","black clean"],
        "hair_csv_m": ["black short","dark close"],
        "eyes": ["dark brown eyes","warm brown eyes","deep brown eyes","black-brown eyes"],
        "eyes_csv": ["dark brown","warm brown","deep brown","black-brown"],
        "ethnicity_csv": "Southeast Asian — Filipino",
        "heritage_phrase_f": "Filipino heritage",
        "heritage_phrase_m": "Filipino heritage",
    },
    "Indonesian": {
        "f": "Indonesian woman",
        "m": "Indonesian man",
        "skin_f": "warm medium-brown complexion with golden tone",
        "skin_m": "warm medium-brown complexion",
        "skin_csv_f": "warm medium brown — Indonesian",
        "skin_csv_m": "warm medium brown — Southeast Asian",
        "hair_f": ["black hair worn neat","dark hair arranged practical",
                   "straight black hair","black hair in a clean style"],
        "hair_m": ["short black hair","close-cropped dark hair"],
        "hair_csv_f": ["black neat","dark practical","straight black","black clean"],
        "hair_csv_m": ["black short","dark close"],
        "eyes": ["dark brown eyes","deep brown eyes","warm dark eyes","black-brown eyes"],
        "eyes_csv": ["dark brown","deep brown","warm dark","black-brown"],
        "ethnicity_csv": "Southeast Asian — Indonesian",
        "heritage_phrase_f": "Indonesian heritage",
        "heritage_phrase_m": "Indonesian heritage",
    },
    "Brazilian": {
        "f": "Brazilian woman of mixed Afro-European heritage",
        "m": "Brazilian man of mixed Afro-European heritage",
        "skin_f": "warm brown complexion with Brazilian mixed heritage",
        "skin_m": "warm brown complexion",
        "skin_csv_f": "warm brown — Brazilian mixed Afro-European",
        "skin_csv_m": "warm brown — Brazilian mixed",
        "hair_f": ["dark curly hair worn loose","black wavy hair neat",
                   "rich dark brown curls","natural dark coils styled practical"],
        "hair_m": ["short dark curly hair","close-cropped dark hair"],
        "hair_csv_f": ["dark curly","black wavy neat","rich dark brown curls","dark coils"],
        "hair_csv_m": ["dark curly short","dark close"],
        "eyes": ["dark brown eyes","warm brown eyes","hazel-brown eyes","deep brown eyes"],
        "eyes_csv": ["dark brown","warm brown","hazel-brown","deep brown"],
        "ethnicity_csv": "Latin American — Brazilian Afro-European",
        "heritage_phrase_f": "Brazilian heritage",
        "heritage_phrase_m": "Brazilian heritage",
    },
    "Mexican": {
        "f": "Mexican woman of Indigenous-Spanish heritage",
        "m": "Mexican man of Indigenous-Spanish heritage",
        "skin_f": "warm tan-brown complexion with Indigenous-Spanish heritage",
        "skin_m": "warm tan-brown complexion",
        "skin_csv_f": "warm tan-brown — Mexican Indigenous-Spanish",
        "skin_csv_m": "warm tan-brown — Mexican",
        "hair_f": ["dark brown hair worn neat","black hair in a practical style",
                   "rich brown hair","black hair arranged clean"],
        "hair_m": ["dark hair short","black close-cropped"],
        "hair_csv_f": ["dark brown neat","black practical","rich brown","black clean"],
        "hair_csv_m": ["dark short","black close"],
        "eyes": ["dark brown eyes","warm brown eyes","deep brown eyes","black-brown eyes"],
        "eyes_csv": ["dark brown","warm brown","deep brown","black-brown"],
        "ethnicity_csv": "Latin American — Mexican Mestizo",
        "heritage_phrase_f": "Mexican heritage",
        "heritage_phrase_m": "Mexican heritage",
    },
    "Colombian": {
        "f": "Colombian woman",
        "m": "Colombian man",
        "skin_f": "warm medium complexion with Latin American heritage",
        "skin_m": "warm medium complexion",
        "skin_csv_f": "warm medium — Colombian Latin American",
        "skin_csv_m": "warm medium — Latin American",
        "hair_f": ["dark brown wavy hair","black hair neat","rich brown hair",
                   "dark brown hair arranged practical"],
        "hair_m": ["dark hair short","brown close-cropped"],
        "hair_csv_f": ["dark brown wavy","black neat","rich brown","dark brown practical"],
        "hair_csv_m": ["dark short","brown close"],
        "eyes": ["dark brown eyes","warm hazel eyes","brown eyes","deep brown eyes"],
        "eyes_csv": ["dark brown","warm hazel","brown","deep brown"],
        "ethnicity_csv": "Latin American — Colombian",
        "heritage_phrase_f": "Colombian heritage",
        "heritage_phrase_m": "Colombian heritage",
    },
    "Argentine": {
        "f": "Argentine woman of European-Latin heritage",
        "m": "Argentine man of European-Latin heritage",
        "skin_f": "light warm complexion with Southern European-Latin tone",
        "skin_m": "light warm complexion",
        "skin_csv_f": "light warm — Argentine European-Latin",
        "skin_csv_m": "light warm — Argentine",
        "hair_f": ["dark brown hair worn neat","chestnut hair arranged",
                   "rich brown hair","warm dark hair practical"],
        "hair_m": ["dark hair short","brown close-cropped"],
        "hair_csv_f": ["dark brown neat","chestnut arranged","rich brown","warm dark"],
        "hair_csv_m": ["dark short","brown close"],
        "eyes": ["dark brown eyes","hazel eyes","warm brown eyes","green-brown eyes"],
        "eyes_csv": ["dark brown","hazel","warm brown","green-brown"],
        "ethnicity_csv": "Latin American — Argentine European synthesis",
        "heritage_phrase_f": "Argentine heritage",
        "heritage_phrase_m": "Argentine heritage",
    },
    "Arab": {
        "f": "Arab woman of Middle Eastern heritage",
        "m": "Arab man of Middle Eastern heritage",
        "skin_f": "warm olive-brown complexion with Middle Eastern features",
        "skin_m": "warm olive complexion",
        "skin_csv_f": "warm olive-brown — Middle Eastern Arab",
        "skin_csv_m": "warm olive — Arab",
        "hair_f": ["dark brown hair worn neat","black hair arranged practical",
                   "deep black hair","dark hair in a clean style"],
        "hair_m": ["dark hair short","black close-cropped"],
        "hair_csv_f": ["dark brown neat","black practical","deep black","dark clean"],
        "hair_csv_m": ["dark short","black close"],
        "eyes": ["dark brown eyes","deep brown eyes","warm hazel eyes","amber-brown eyes"],
        "eyes_csv": ["dark brown","deep brown","warm hazel","amber-brown"],
        "ethnicity_csv": "Middle Eastern — Arab MENA",
        "heritage_phrase_f": "Arab heritage",
        "heritage_phrase_m": "Arab heritage",
    },
    "Iranian": {
        "f": "Iranian woman of Persian heritage",
        "m": "Iranian man of Persian heritage",
        "skin_f": "warm medium-olive complexion with Persian features",
        "skin_m": "warm olive complexion",
        "skin_csv_f": "warm medium olive — Iranian Persian",
        "skin_csv_m": "warm olive — Persian",
        "hair_f": ["dark brown hair worn neat","black hair arranged",
                   "rich dark brown hair","black hair in a practical style"],
        "hair_m": ["dark hair short","black close-cropped"],
        "hair_csv_f": ["dark brown neat","black arranged","rich dark brown","black practical"],
        "hair_csv_m": ["dark short","black close"],
        "eyes": ["dark brown eyes","deep hazel eyes","warm brown eyes","amber eyes"],
        "eyes_csv": ["dark brown","deep hazel","warm brown","amber"],
        "ethnicity_csv": "Middle Eastern — Iranian Persian",
        "heritage_phrase_f": "Persian heritage",
        "heritage_phrase_m": "Persian heritage",
    },
    "Nigerian_Yoruba": {
        "f": "Nigerian woman of Yoruba heritage",
        "m": "Nigerian man of Yoruba heritage",
        "skin_f": "deep warm brown skin with rich West African undertone",
        "skin_m": "deep warm brown skin, West African features",
        "skin_csv_f": "deep warm brown — Nigerian Yoruba",
        "skin_csv_m": "deep brown — Yoruba West African",
        "hair_f": ["natural black hair worn in a structured style",
                   "natural coils arranged neat","close-cropped natural hair"],
        "hair_m": ["close-cropped black hair","natural short hair"],
        "hair_csv_f": ["natural black structured","natural coils neat","close-cropped natural"],
        "hair_csv_m": ["close-cropped black","natural short"],
        "eyes": ["warm dark brown eyes","deep brown eyes","dark expressive eyes"],
        "eyes_csv": ["warm dark brown","deep brown","dark expressive"],
        "ethnicity_csv": "West African — Nigerian Yoruba",
        "heritage_phrase_f": "Yoruba heritage",
        "heritage_phrase_m": "Yoruba heritage",
    },
    "Nigerian_Igbo": {
        "f": "Nigerian woman of Igbo heritage",
        "m": "Nigerian man of Igbo heritage",
        "skin_f": "deep rich brown skin with Igbo West African features",
        "skin_m": "deep brown skin, Igbo features",
        "skin_csv_f": "deep rich brown — Nigerian Igbo",
        "skin_csv_m": "deep brown — Igbo West African",
        "hair_f": ["natural black hair neat","close-cropped natural hair",
                   "natural coils in a clean style"],
        "hair_m": ["close-cropped black hair","natural short hair"],
        "hair_csv_f": ["natural black neat","close-cropped natural","natural coils clean"],
        "hair_csv_m": ["close-cropped black","natural short"],
        "eyes": ["warm dark brown eyes","deep brown eyes","dark expressive eyes"],
        "eyes_csv": ["warm dark brown","deep brown","dark expressive"],
        "ethnicity_csv": "West African — Nigerian Igbo",
        "heritage_phrase_f": "Igbo heritage",
        "heritage_phrase_m": "Igbo heritage",
    },
    "Ghanaian": {
        "f": "Ghanaian woman",
        "m": "Ghanaian man",
        "skin_f": "deep brown skin with warm West African undertone",
        "skin_m": "deep brown skin, West African features",
        "skin_csv_f": "deep warm brown — Ghanaian",
        "skin_csv_m": "deep brown — Ghanaian West African",
        "hair_f": ["natural black hair in a neat arrangement","close-cropped natural",
                   "natural coils structured neat"],
        "hair_m": ["close-cropped black hair","natural short hair"],
        "hair_csv_f": ["natural black neat","close-cropped natural","natural coils neat"],
        "hair_csv_m": ["close-cropped black","natural short"],
        "eyes": ["warm dark brown eyes","deep brown eyes","dark expressive eyes"],
        "eyes_csv": ["warm dark brown","deep brown","dark expressive"],
        "ethnicity_csv": "West African — Ghanaian",
        "heritage_phrase_f": "Ghanaian heritage",
        "heritage_phrase_m": "Ghanaian heritage",
    },
    "Kenyan": {
        "f": "Kenyan woman of East African heritage",
        "m": "Kenyan man of East African heritage",
        "skin_f": "rich deep brown skin with East African features",
        "skin_m": "rich deep brown skin, East African features",
        "skin_csv_f": "rich deep brown — Kenyan East African",
        "skin_csv_m": "rich deep brown — East African",
        "hair_f": ["natural black hair in a neat style","close-cropped natural",
                   "natural coils arranged"],
        "hair_m": ["close-cropped black hair","natural short hair"],
        "hair_csv_f": ["natural black neat","close-cropped natural","natural coils"],
        "hair_csv_m": ["close-cropped black","natural short"],
        "eyes": ["warm dark brown eyes","deep brown eyes","dark expressive eyes"],
        "eyes_csv": ["warm dark brown","deep brown","dark expressive"],
        "ethnicity_csv": "East African — Kenyan",
        "heritage_phrase_f": "Kenyan heritage",
        "heritage_phrase_m": "Kenyan heritage",
    },
    "South_African": {
        "f": "South African woman",
        "m": "South African man",
        "skin_f": "warm deep brown skin with Southern African features",
        "skin_m": "warm deep brown skin, Southern African features",
        "skin_csv_f": "warm deep brown — South African",
        "skin_csv_m": "warm deep brown — Southern African",
        "hair_f": ["natural black hair neat","close-cropped natural",
                   "natural coils in a structured arrangement"],
        "hair_m": ["close-cropped black hair","natural short hair"],
        "hair_csv_f": ["natural black neat","close-cropped natural","natural coils structured"],
        "hair_csv_m": ["close-cropped black","natural short"],
        "eyes": ["warm dark brown eyes","deep brown eyes","dark expressive eyes"],
        "eyes_csv": ["warm dark brown","deep brown","dark expressive"],
        "ethnicity_csv": "Southern African — South African",
        "heritage_phrase_f": "South African heritage",
        "heritage_phrase_m": "South African heritage",
    },
    "Ethiopian": {
        "f": "Ethiopian woman",
        "m": "Ethiopian man",
        "skin_f": "warm brown skin with East African features",
        "skin_m": "warm brown skin, refined East African features",
        "skin_csv_f": "warm brown — Ethiopian East African",
        "skin_csv_m": "warm brown — Ethiopian",
        "hair_f": ["natural black hair in a neat arrangement","close-cropped natural",
                   "natural black coils neat"],
        "hair_m": ["close-cropped black hair","natural short hair"],
        "hair_csv_f": ["natural black neat","close-cropped natural","natural coils neat"],
        "hair_csv_m": ["close-cropped black","natural short"],
        "eyes": ["dark expressive eyes","warm dark brown eyes","deep brown eyes"],
        "eyes_csv": ["dark expressive","warm dark brown","deep brown"],
        "ethnicity_csv": "East African — Ethiopian",
        "heritage_phrase_f": "Ethiopian heritage",
        "heritage_phrase_m": "Ethiopian heritage",
    },
    "Cameroonian": {
        "f": "Cameroonian woman of Central African heritage",
        "m": "Cameroonian man of Central African heritage",
        "skin_f": "deep rich brown skin, Central African features",
        "skin_m": "deep brown skin, strong Central African features",
        "skin_csv_f": "deep rich brown — Cameroonian Central African",
        "skin_csv_m": "deep brown — Central African",
        "hair_f": ["natural black hair","close-cropped hair"],
        "hair_m": ["close-cropped black hair"],
        "hair_csv_f": ["natural black","close-cropped"],
        "hair_csv_m": ["close-cropped black"],
        "eyes": ["warm dark brown eyes","deep brown eyes"],
        "eyes_csv": ["warm dark brown","deep brown"],
        "ethnicity_csv": "Central African — Cameroonian",
        "heritage_phrase_f": "Cameroonian heritage",
        "heritage_phrase_m": "Cameroonian heritage",
    },
    "Senegalese": {
        "f": "Senegalese woman of West African heritage",
        "m": "Senegalese man of West African heritage",
        "skin_f": "very deep rich brown skin, West African features",
        "skin_m": "very deep brown skin, strong West African features",
        "skin_csv_f": "very deep rich brown — Senegalese",
        "skin_csv_m": "very deep brown — West African Senegalese",
        "hair_f": ["natural black hair in a structured style"],
        "hair_m": ["close-cropped black hair"],
        "hair_csv_f": ["natural black structured"],
        "hair_csv_m": ["close-cropped black"],
        "eyes": ["very dark expressive eyes","dark warm eyes"],
        "eyes_csv": ["very dark expressive","dark warm"],
        "ethnicity_csv": "West African — Senegalese",
        "heritage_phrase_f": "Senegalese heritage",
        "heritage_phrase_m": "Senegalese heritage",
    },
    "Caribbean_Black": {
        "f": "Caribbean woman of Afro-Caribbean heritage",
        "m": "Caribbean man of Afro-Caribbean heritage",
        "skin_f": "warm deep brown skin, Caribbean features",
        "skin_m": "warm deep brown skin, Caribbean features",
        "skin_csv_f": "warm deep brown — Afro-Caribbean",
        "skin_csv_m": "warm deep brown — Caribbean",
        "hair_f": ["natural black coils in a practical arrangement"],
        "hair_m": ["close-cropped black hair"],
        "hair_csv_f": ["natural black coils practical"],
        "hair_csv_m": ["close-cropped black"],
        "eyes": ["warm dark brown eyes","deep brown eyes"],
        "eyes_csv": ["warm dark brown","deep brown"],
        "ethnicity_csv": "Caribbean — Afro-Caribbean",
        "heritage_phrase_f": "Afro-Caribbean heritage",
        "heritage_phrase_m": "Afro-Caribbean heritage",
    },
    "African_American": {
        "f": "African-American woman",
        "m": "African-American man",
        "skin_f": "warm brown skin, African-American features",
        "skin_m": "warm brown skin, strong African-American features",
        "skin_csv_f": "warm brown — African-American",
        "skin_csv_m": "warm brown — African-American",
        "hair_f": ["natural black hair worn practical"],
        "hair_m": ["close-cropped black hair"],
        "hair_csv_f": ["natural black practical"],
        "hair_csv_m": ["close-cropped black"],
        "eyes": ["warm dark brown eyes","deep brown eyes"],
        "eyes_csv": ["warm dark brown","deep brown"],
        "ethnicity_csv": "African-American",
        "heritage_phrase_f": "African-American heritage",
        "heritage_phrase_m": "African-American heritage",
    },
}


# ─── Prompt builders ───────────────────────────────────────────────────────────

def build_new_prompt(original_prompt: str, ethnic_key: str, gender: str, idx: int) -> str:
    """Rebuild a Fal.ai / Gemini image prompt with new ethnic/gender descriptors."""
    p = PROFILES[ethnic_key]
    gk = "f" if gender == "female" else "m"
    hair = p[f"hair_{gk}"][idx % len(p[f"hair_{gk}"])]
    eyes = p["eyes"][idx % len(p["eyes"])]
    skin = p[f"skin_{gk}"]
    ethnic_desc = p[gk]

    age_match = re.search(r"(\d+)-year-old", original_prompt)
    age_phrase = f"{age_match.group(1)}-year-old" if age_match else "mature"

    costume_match = re.search(
        r"((?:She|He|They)\s+wears?|(?:wears?|wearing|dressed\s+in|in\s+(?:a|an|the|full|dark|deep|formal|field))\s+)",
        original_prompt, re.IGNORECASE
    )
    bg_match = re.search(r"Background:\s*(.+?)\.?\s*$", original_prompt, re.DOTALL)
    background = bg_match.group(1).strip() if bg_match else "neutral dramatic background"

    lighting_match = re.search(
        r"((?:warm|cold|cool|soft|harsh|clinical|neutral|directional|overhead|natural|formal|"
        r"survey|military|monastery|fluorescent|amber|cinematic)\s+(?:lighting|light|directional[^.]*|"
        r"overhead[^.]*|studio[^.]*))",
        original_prompt, re.IGNORECASE
    )
    lighting = lighting_match.group(1).strip() if lighting_match else "cinematic directional lighting"

    if costume_match:
        after_costume = original_prompt[costume_match.start():]
        narrative_sentences = []
        for sent in re.split(r'(?<=[.!?])\s+', after_costume):
            sent = sent.strip()
            if sent and not re.match(r'^(Photorealistic|Ultra-realistic|Background|The lighting)', sent, re.IGNORECASE):
                if len(sent) > 30:
                    narrative_sentences.append(sent)
        narrative = ' '.join(narrative_sentences[:3])
    else:
        sentences = re.split(r'(?<=[.!?])\s+', original_prompt)
        narrative = ' '.join(sentences[2:min(6, len(sentences))])

    prompt = (
        f"Full-body portrait of a {age_phrase} {ethnic_desc}. "
        f"{skin.capitalize()}. "
        f"{hair.capitalize()}. {eyes.capitalize()}. "
        f"{narrative} "
        f"Photorealistic. {lighting.capitalize()}. Background: {background}."
    )
    return re.sub(r'\s{2,}', ' ', prompt).strip()


def build_grok_prompt(original_grok: str, ethnic_key: str, gender: str, idx: int) -> str:
    """Rebuild a Grok alt prompt with new ethnic/gender descriptors."""
    p = PROFILES[ethnic_key]
    gk = "f" if gender == "female" else "m"
    hair = p[f"hair_{gk}"][idx % len(p[f"hair_{gk}"])]
    eyes = p["eyes"][idx % len(p["eyes"])]
    skin = p[f"skin_{gk}"]
    ethnic_desc = p[gk]

    age_match = re.search(r"(\d+)-year-old", original_grok)
    age_phrase = f"{age_match.group(1)}-year-old" if age_match else "mature"

    bg_match = re.search(r"Background:\s*(.+?)\.?\s*$", original_grok, re.DOTALL)
    background = bg_match.group(1).strip() if bg_match else "neutral background"

    lighting_match = re.search(
        r"((?:warm|cold|cool|soft|harsh|clinical|neutral|directional|overhead|natural|formal|"
        r"survey|military|monastery|fluorescent|amber|cinematic)\s+(?:lighting|light|[^\n.]{0,40}))",
        original_grok, re.IGNORECASE
    )
    lighting = lighting_match.group(1).strip() if lighting_match else "cinematic lighting"

    # Extract 1-2 narrative sentences (the character's essence)
    sentences = re.split(r'(?<=[.!?])\s+', original_grok)
    narrative_bits = []
    for s in sentences[2:]:
        s = s.strip()
        if s and not re.match(r'^(Ultra-realistic|Photorealistic|Background|lighting)', s, re.IGNORECASE):
            if len(s) > 25:
                narrative_bits.append(s)
        if len(narrative_bits) >= 2:
            break
    narrative = ' '.join(narrative_bits)

    prompt = (
        f"Ultra-realistic portrait. A {age_phrase} {ethnic_desc}. "
        f"{skin.capitalize()}. {hair.capitalize()}. {eyes.capitalize()}. "
        f"{narrative} "
        f"{lighting.capitalize()}. Background: {background}."
    )
    return re.sub(r'\s{2,}', ' ', prompt).strip()


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
            if cid and name:
                characters.append({
                    'id': cid, 'name': row.get('name_display','').strip(),
                    'tier': row.get('tier','').strip(),
                    'faction': row.get('faction','').strip(),
                    'age': row.get('age_approx','').strip(),
                    'original_prompt': row.get('gemini_image_prompt','').strip(),
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
            'id': char_id, 'name': raw_name,
            'tier': tier_m.group(1).strip() if tier_m else '',
            'faction': faction_m.group(1).strip() if faction_m else '',
            'age': age_m.group(1).strip() if age_m else '',
            'original_prompt': prompt,
            'slug': slug(raw_name),
        })
    return characters


# ─── Markdown rewriter ─────────────────────────────────────────────────────────

def rewrite_md_bible(path: Path, char_assignments: dict) -> int:
    """
    Rewrite all > **Gemini:** and > **Grok:** blocks in a markdown bible.
    char_assignments: {char_id: {'ethnic_key': ..., 'gender': ..., 'idx': ...}}
    Returns count of replacements made.
    """
    text = path.read_text(encoding='utf-8')
    sections = re.split(r'(\n(?=###\s+))', text)

    replaced = 0
    result_parts = []

    # We'll work on the full text, replacing section by section
    # Split into character sections and non-character parts
    full_sections = re.split(r'\n(?=###\s+(?:E-\d+|\d+)\s+[·•·])', text)

    new_sections = []
    for section in full_sections:
        hm = re.match(r'###\s+(E-\d+|\d+)\s+[·•·]', section, re.IGNORECASE)
        if not hm:
            new_sections.append(section)
            continue

        char_id = hm.group(1).strip()
        if char_id not in char_assignments:
            new_sections.append(section)
            continue

        asgn = char_assignments[char_id]
        ethnic_key = asgn['ethnic_key']
        gender = asgn['gender']
        idx = asgn['idx']

        # Replace Gemini block
        def replace_gemini(m):
            orig = re.sub(r'\s+', ' ', m.group(1)).strip()
            new_p = build_new_prompt(orig, ethnic_key, gender, idx)
            return f'> **Gemini:** {new_p}'

        new_section = re.sub(
            r'>\s*\*\*Gemini:\*\*\s*(.+?)(?=\n>\s*\*\*Grok|\n\n---|\n\n###|\Z)',
            replace_gemini, section, flags=re.DOTALL
        )

        # Replace Grok block
        def replace_grok(m):
            orig = re.sub(r'\s+', ' ', m.group(1)).strip()
            new_p = build_grok_prompt(orig, ethnic_key, gender, idx)
            return f'> **Grok:** {new_p}'

        new_section = re.sub(
            r'>\s*\*\*Grok:\*\*\s*(.+?)(?=\n\n---|\n\n###|\Z)',
            replace_grok, new_section, flags=re.DOTALL
        )

        if new_section != section:
            replaced += 1

        new_sections.append(new_section)

    new_text = '\n'.join(new_sections) if len(full_sections) > 1 else new_sections[0]

    # Preserve original line ending style
    if '\r\n' in text and '\r\n' not in new_text:
        new_text = new_text.replace('\n', '\r\n')

    path.write_text(new_text, encoding='utf-8')
    return replaced


# ─── CSV rewriter ──────────────────────────────────────────────────────────────

def rewrite_csv(path: Path, char_assignments: dict) -> int:
    """Rewrite physical description columns in the Vol1 CSV."""
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    replaced = 0
    for row in rows:
        cid = row.get('character_id', '').strip()
        if cid not in char_assignments:
            continue

        asgn = char_assignments[cid]
        ethnic_key = asgn['ethnic_key']
        gender = asgn['gender']
        idx = asgn['idx']
        p = PROFILES[ethnic_key]
        gk = "f" if gender == "female" else "m"

        # The Architect (id=1) is intentionally androgynous — skip visual rewrite
        if cid == "1":
            continue

        # Update CSV physical columns
        row['ethnicity_inspiration'] = p['ethnicity_csv']
        row['gender'] = gender
        row['skin_tone'] = p[f'skin_csv_{gk}']
        row['hair_colour'] = p[f'hair_csv_{gk}'][idx % len(p[f'hair_csv_{gk}'])]
        row['eye_colour'] = p['eyes_csv'][idx % len(p['eyes_csv'])]

        # Rebuild image prompts
        orig_gemini = row.get('gemini_image_prompt', '')
        orig_grok = row.get('grok_image_prompt_alt', '')
        if orig_gemini:
            row['gemini_image_prompt'] = build_new_prompt(orig_gemini, ethnic_key, gender, idx)
        if orig_grok:
            row['grok_image_prompt_alt'] = build_grok_prompt(orig_grok, ethnic_key, gender, idx)

        replaced += 1

    # Filter out None fieldnames (trailing empty columns from extra commas)
    clean_fields = [f for f in fieldnames if f is not None]
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=clean_fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)

    return replaced


# ─── Vol1 prose Appearance rewriter ───────────────────────────────────────────

APPEARANCE_REWRITES = {}  # filled after assignments computed

def build_appearance_prose(char_id: str, original_appearance: str, ethnic_key: str,
                            gender: str, idx: int) -> str:
    """
    Rewrite a prose **Appearance:** block to reflect new ethnicity/gender.
    Keeps the character's personality/posture observations; replaces physical descriptors.
    """
    p = PROFILES[ethnic_key]
    gk = "f" if gender == "female" else "m"
    skin = p[f'skin_{gk}']
    hair = p[f'hair_{gk}'][idx % len(p[f'hair_{gk}'])]
    heritage = p[f'heritage_phrase_{gk}']

    # Replace heritage references
    # Replace common heritage patterns
    original = original_appearance
    original = re.sub(
        r"of\s+\w+[-\w]*\s+heritage",
        f"of {heritage}",
        original, flags=re.IGNORECASE
    )

    # Replace skin tone descriptions
    skin_patterns = [
        r"very fair complexion[^.]*",
        r"fair complexion[^.]*",
        r"dark[^.,]*complexion[^.]*",
        r"brown skin[^.]*",
        r"deep[^.,]*brown skin[^.]*",
        r"warm[^.,]*brown skin[^.]*",
        r"olive complexion[^.]*",
        r"warm[^.,]*tone[^.]*",
    ]
    for pat in skin_patterns:
        m = re.search(pat, original, re.IGNORECASE)
        if m:
            original = original[:m.start()] + skin + original[m.end():]
            break

    # Replace hair descriptions — find "her/his hair" or hair colour mentions
    hair_patterns = [
        r"(?:Her|His|Their)\s+hair\s+is[^.]+\.",
        r"(?:Auburn|Red|Copper|Platinum|Silver|White|Light\s+brown|Dark\s+brown|Black|Blonde|Golden|Chestnut|Natural\s+black|Natural\s+coils)[^.]*hair[^.]*\.",
        r"hair\s+(?:is\s+)?worn[^.]+\.",
        r"hair\s+(?:is\s+)?(?:natural|close-cropped|short)[^.]*\.",
    ]
    for pat in hair_patterns:
        m = re.search(pat, original, re.IGNORECASE)
        if m:
            # Capitalize first letter of hair description
            hair_sent = hair[0].upper() + hair[1:]
            original = original[:m.start()] + hair_sent + ". " + original[m.end():]
            break

    return original.strip()


def rewrite_vol1_md(path: Path, char_assignments: dict) -> int:
    """Rewrite **Appearance:** blocks in Vol1 bible prose."""
    text = path.read_text(encoding='utf-8')

    def replace_appearance(m):
        # Find which character this belongs to by looking backwards for the ### header
        pos = m.start()
        preceding = text[:pos]
        header_m = list(re.finditer(r'###\s+(E-\d+|\d+)\s+[·•·]', preceding))
        if not header_m:
            return m.group(0)
        char_id = header_m[-1].group(1).strip()
        if char_id not in char_assignments or char_id == "1":
            return m.group(0)
        asgn = char_assignments[char_id]
        new_text = build_appearance_prose(
            char_id, m.group(1),
            asgn['ethnic_key'], asgn['gender'], asgn['idx']
        )
        return f'**Appearance:** {new_text}'

    new_text = re.sub(r'\*\*Appearance:\*\*\s*(.+?)(?=\n\n\*\*|\n\n###|\n\n---|\Z)',
                      replace_appearance, text, flags=re.DOTALL)
    path.write_text(new_text, encoding='utf-8')
    return text != new_text


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=== The Concord — Canonical Character Rewrite ===\n")

    # 1. Load all characters to get their order (same order as rewrite-and-generate.py)
    print("Loading characters to establish assignment order...")
    chars = parse_vol1_csv()
    for fname in [
        "CANONICAL_CHARACTER_BIBLE.md",
    ]:
        p = GAME_BIBLE_DIR / fname
        if p.exists():
            chars.extend(parse_md_bible(p))

    seen = set()
    unique = []
    for c in chars:
        if c['id'] not in seen:
            seen.add(c['id'])
            unique.append(c)
    chars = unique
    print(f"  {len(chars)} unique characters")

    # 2. Build assignment lookup
    char_assignments = {}
    for i, c in enumerate(chars):
        ethnic_key = ETHNIC_ASSIGNMENTS_500[i] if i < len(ETHNIC_ASSIGNMENTS_500) else ETHNIC_ASSIGNMENTS_500[i % 500]
        gender = GENDER_ASSIGNMENTS_500[i] if i < len(GENDER_ASSIGNMENTS_500) else GENDER_ASSIGNMENTS_500[i % 500]
        char_assignments[c['id']] = {
            'ethnic_key': ethnic_key,
            'gender': gender,
            'idx': i,
            'name': c['name'],
        }

    print(f"  Assignments built for {len(char_assignments)} characters\n")

    # 3. Rewrite markdown bibles
    md_files = [
        ("CANONICAL_CHARACTER_BIBLE.md", "Canonical"),
    ]

    print("Rewriting markdown bibles...")
    for fname, label in md_files:
        fpath = GAME_BIBLE_DIR / fname
        if not fpath.exists():
            print(f"  [skip] {label} — not found")
            continue
        count = rewrite_md_bible(fpath, char_assignments)
        print(f"  ✓ {label}: {count} characters rewritten")

    # 4. Rewrite Vol1 prose Appearance blocks
    vol1_path = GAME_BIBLE_DIR / "The_Concord_Character_Bible_Vol1.md"
    if vol1_path.exists():
        changed = rewrite_vol1_md(vol1_path, char_assignments)
        print(f"  ✓ Vol1 (Appearance prose): {'updated' if changed else 'no changes'}")

    # 5. Rewrite CSV
    print("\nRewriting Vol1 CSV...")
    csv_primary = GAME_BIBLE_DIR / "The_Concord_Character_Visual_Manifest_Vol1.csv"
    if csv_primary.exists():
        count = rewrite_csv(csv_primary, char_assignments)
        print(f"  ✓ Visual Manifest Vol1.csv: {count} rows rewritten")

    csv_copy = GAME_BIBLE_DIR / "The_Concord_Character_Visual_Manifest_Vol1 (1).csv"
    if csv_copy.exists():
        count = rewrite_csv(csv_copy, char_assignments)
        print(f"  ✓ Visual Manifest Vol1 (copy).csv: {count} rows rewritten")

    # 6. Update manifest JSON
    print("\nUpdating character-manifest.json...")
    manifest = {}
    for i, c in enumerate(chars):
        asgn = char_assignments[c['id']]
        ethnic_key = asgn['ethnic_key']
        gender = asgn['gender']
        p = PROFILES[ethnic_key]
        gk = "f" if gender == "female" else "m"
        manifest[c['id']] = {
            'name': c['name'],
            'tier': c['tier'],
            'faction': c['faction'],
            'ethnic_key': ethnic_key,
            'ethnicity_label': p['ethnicity_csv'],
            'gender': gender,
            'is_black': ethnic_key in BLACK_GROUPS,
            'slug': c['slug'],
            'new_prompt': build_new_prompt(c['original_prompt'], ethnic_key, gender, i),
        }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"  ✓ Written: {MANIFEST_PATH}")

    # 7. Regenerate CHARACTER-DESIGN-BRIEF.md
    print("\nRegenerating CHARACTER-DESIGN-BRIEF.md...")
    output_dir = BASE_DIR / "docs" / "character-references"
    total    = len(chars)
    white    = sum(1 for c in chars if char_assignments[c['id']]['ethnic_key'] in set(_WHITE))
    east_a   = sum(1 for c in chars if char_assignments[c['id']]['ethnic_key'] in set(_EAST_A))
    south_a  = sum(1 for c in chars if char_assignments[c['id']]['ethnic_key'] in set(_SOUTH_A))
    se_a     = sum(1 for c in chars if char_assignments[c['id']]['ethnic_key'] in set(_SE_A))
    latin    = sum(1 for c in chars if char_assignments[c['id']]['ethnic_key'] in set(_LATIN))
    mena     = sum(1 for c in chars if char_assignments[c['id']]['ethnic_key'] in set(_MENA))
    black    = sum(1 for c in chars if char_assignments[c['id']]['ethnic_key'] in BLACK_GROUPS)
    female   = sum(1 for c in chars if char_assignments[c['id']]['gender'] == 'female')
    male     = total - female

    lines = [
        "# The Concord — Character Design Brief (Canonical Revision)",
        "",
        f"> Updated: 2026-03-18  |  Total: {total} characters",
        "",
        "## Racial Distribution",
        "",
        f"| Group | Count | % | Target |",
        f"|-------|-------|---|--------|",
        f"| White / Western European | {white} | {white/total*100:.0f}% | 44% |",
        f"| East Asian | {east_a} | {east_a/total*100:.0f}% | 19% |",
        f"| Latin American | {latin} | {latin/total*100:.0f}% | 13% |",
        f"| Black / African | {black} | {black/total*100:.0f}% | 11% |",
        f"| South Asian | {south_a} | {south_a/total*100:.0f}% | 7% |",
        f"| Middle Eastern / MENA | {mena} | {mena/total*100:.0f}% | 4% |",
        f"| Southeast Asian | {se_a} | {se_a/total*100:.0f}% | 2% |",
        "",
        f"## Gender: {male} male ({male/total*100:.0f}%)  ·  {female} female ({female/total*100:.0f}%)  target 65/35%",
        "",
        "---",
        "",
        "## Character Roster",
        "",
        "| ID | Name | Ethnicity | Gender | Portrait |",
        "|----|------|-----------|--------|---------|",
    ]

    for c in chars:
        asgn = char_assignments[c['id']]
        p = PROFILES[asgn['ethnic_key']]
        portrait = output_dir / f"{c['id']}-{c['slug']}.jpg"
        status = "✅" if portrait.exists() else "⬜"
        lines.append(
            f"| `{c['id']}` | {c['name']} | {p['ethnicity_csv']} | {asgn['gender']} | {status} |"
        )

    lines += ["", "---", "", "## Character Entries", ""]

    for c in chars:
        asgn = char_assignments[c['id']]
        p = PROFILES[asgn['ethnic_key']]
        gk = "f" if asgn['gender'] == "female" else "m"
        portrait = output_dir / f"{c['id']}-{c['slug']}.jpg"
        status_icon = "✅" if portrait.exists() else "⬜"
        new_prompt = manifest[c['id']]['new_prompt']
        lines += [
            f"### {c['id']} · {c['name']}",
            "",
            f"- **Tier:** {c['tier']}",
            f"- **Faction:** {c['faction']}",
            f"- **Ethnicity:** {p['ethnicity_csv']}",
            f"- **Gender:** {asgn['gender']}",
            f"- **Skin:** {p[f'skin_{gk}']}",
            f"- **File:** `{c['id']}-{c['slug']}.jpg` {status_icon}",
            "",
            "**Generation Prompt:**",
            "",
            f"> {new_prompt}",
            "",
            "---",
            "",
        ]

    BRIEF_PATH.write_text('\n'.join(lines), encoding='utf-8')
    print(f"  ✓ Written: {BRIEF_PATH}")

    print(f"\n=== Done ===")
    print(f"  {total} characters canonicalized across all documents")
    print(f"  Distribution: White={white} ({white/total*100:.0f}%) | EastAsian={east_a} ({east_a/total*100:.0f}%) | Latin={latin} ({latin/total*100:.0f}%) | Black={black} ({black/total*100:.0f}%) | SouthAsian={south_a} ({south_a/total*100:.0f}%) | MENA={mena} ({mena/total*100:.0f}%) | SEAsian={se_a} ({se_a/total*100:.0f}%)")
    print(f"  Gender: {male}M ({male/total*100:.0f}%) / {female}F ({female/total*100:.0f}%)  target 65/35%")


if __name__ == "__main__":
    main()
