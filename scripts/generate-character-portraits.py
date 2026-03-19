#!/usr/bin/env python3
"""
Batch generate Fal.ai FLUX-pro v1.1 reference portraits for all 50 Kindler Guide characters.
Saves images to docs/character-references/ and prints progress.
Stops gracefully on credit limit (402) or any unrecoverable error.

Usage: python scripts/generate-character-portraits.py
"""

import asyncio
import json
import time
import urllib.request
import urllib.error
import os
import sys
from pathlib import Path

API_KEY = "553b4624-3af5-4e45-9adc-2a8e385eea85:f4f9eaeb72e127d10cb0ceaf77615520"
MODEL = "fal-ai/flux-pro/v1.1"
BASE_URL = "https://queue.fal.run"
OUTPUT_DIR = Path(__file__).parent.parent / "docs" / "character-references"

CHARACTERS = [
    (1, "professor-nimbus", "photorealistic character concept art, elderly Scottish scientist man age 72, wild floating silver-white hair that moves like cumulus clouds wispy and weightless, deeply lined kind face, pale blue-grey eyes behind wire-rimmed spectacles, weathered ruddy complexion, long dark Victorian-era weatherman's coat with many brass instrument-filled pockets, slightly damp appearance as if emerged from fog, warm authoritative presence, soft natural rim lighting, STEM educational world aesthetic, full body 3/4 view, character design sheet style, ultra detailed, 8k"),
    (2, "zara-ngozi", "photorealistic character concept art, Nigerian-Kenyan girl age 10, dark brown skin, natural braided hair with small brass gear beads woven throughout, bright intelligent expressive eyes, left arm is a beautiful brass-colored articulated mechanical prosthetic with visible gear mechanisms at joints, wearing heavily used denim overalls covered in grease stains and chalk engineering sketches, fidgeting energetic pose, savanna warm light, workshop background suggestion, full body character design, ultra detailed, 8k"),
    (3, "suki-tanaka-reyes", "photorealistic character concept art, Japanese-Filipino marine biologist woman age 34, tan ocean-weathered skin, dark hair in loose salt-stiffened braid with small shells woven in, slight scar on left temple, wearing practical teal-navy wetsuit with waterproof sketchbook attached, hands stained with graphite and saltwater, a beautiful blue-ringed octopus wrapped comfortably around her right forearm as companion, ocean background suggestion, confident relaxed pose, character design sheet style, ultra detailed, 8k"),
    (4, "baxter", "photorealistic fantasy character concept art, anthropomorphic human-sized bee scientist, warm gold and brown striped bee body, large warm amber compound eyes with UV shimmer, translucent folded wings, small white lab coat with pen pocket, fuzzy legs with pollen dust, gentle friendly expression, expressive bee antennae, meadow laboratory background suggestion, standing upright in teacher's pose, character design sheet style, detailed anatomically plausible bee-human hybrid, 8k"),
    (5, "riku-osei", "photorealistic character concept art, Ghanaian-Japanese boy age 9, dark brown skin, East Asian eye shape with unusual cloudy silvery sheen suggesting light sensitivity, slight small build, wearing all dark matte clothing for night observation, thick dark-tinted protective goggles pushed up into close-cropped natural hair, carved wooden staff with astronomical viewing tool at tip, observatory at night background suggestion, quiet contemplative pose, character design sheet style, ultra detailed, 8k"),
    (6, "dottie-chakravarti", "photorealistic character concept art, Indian grandmother mathematician age 68, dark hair with silver streaks in a neat elegant bun, warm brown skin with gentle smile lines, gold-rimmed reading glasses slightly low on nose, wearing beautiful silk sari with intricate geometric mathematical pattern she designed herself (tessellations, golden ratio spirals), graceful dignified posture, garden dirt under elegant fingernails, holds garden trowel and calculator simultaneously, number garden background suggestion, character design sheet style, ultra detailed, 8k"),
    (7, "cal", "photorealistic fantasy character concept art, living crystal humanoid being, slightly child-height, entire body made of faceted translucent crystal with internal blue light pulsing, geometric angular face with no hair, bright crystal facet eyes that intensify in concentration, articulated crystal finger joints on both hands, light refracts and diffracts through crystalline body, neutral pose in teaching stance, cave crystal background suggestion, character design sheet style, ultra detailed, 8k"),
    (8, "lena-sundstrom", "photorealistic character concept art, Swedish-Sami female physicist age 42, tall powerfully athletic build with natural strength, blonde hair in practical braid, strong confident stance as if mid-demonstration, wearing layered functional Sami-influenced outdoor clothing with traditional blue and red geometric accent bands, small worn bronze medal on leather cord necklace, magnet hills environment suggestion, dynamic pose mid-motion, character design sheet style, ultra detailed, 8k"),
    (9, "kofi-amponsah", "photorealistic character concept art, Ghanaian electrician educator man age 38, dark brown skin, close-cropped natural hair, medium build with dignified working-man presence, wearing heavy canvas work pants and organized tool belt with wire cutters pliers and multimeter, forearms with faded healed electrical burn scars from past accident, hands in wiring position showing subtle tremor but extraordinary precision, circuit marsh swamp background suggestion, character design sheet style, ultra detailed, 8k"),
    (10, "pixel", "photorealistic digital-fantasy character concept art, 12-year-old girl who exists between digital and physical worlds, luminous slightly uncanny skin quality, hair shifting between blue-purple and red-orange, simple clothes with edges that partially dissolve into floating light cubes and pixel fragments, sharp intensely intelligent eyes, partly physical partly digital appearance, one arm slightly dissolving into cyan floating pixels, code canyon digital environment suggestion, character design sheet style, ultra detailed, 8k"),
    (11, "dr-emeka-obi", "photorealistic character concept art, Nigerian doctor educator man age 45, tall warm presence, dark brown skin, close-cropped natural hair with early gray at temples, highly expressive eyebrows raised in wonder, white medical coat with bulging pockets containing small anatomical models (rubber heart visible), handmade clay-and-wire pendant on braided cord glowing with faint holographic anatomical display, gentle large hands, body atlas environment suggestion, warm professional pose, character design sheet style, ultra detailed, 8k"),
    (12, "mira-petrov", "photorealistic character concept art, Bulgarian-Russian female geologist age 52, sturdy mountain-weathered build, short brown hair streaked with gray windblown, deeply tanned face with outdoor weathering, visible rugged custom hearing aids in both ears, wearing heavily pocketed practical hiking gear with various rock samples visible in pockets, geological hammer on belt, calloused strong hands one touching a rock surface as if reading it, frost peaks mountain background suggestion, character design sheet style, ultra detailed, 8k"),
    (13, "hugo-fontaine", "photorealistic character concept art, Haitian-French chemist botanist man age 48, dark brown skin, short dreadlocks tied back for work, lean strong build from gardening, small healed scar on right cheek, wearing soil-stained canvas apron over linen shirt with pH testing kit and spray bottle in pockets, large hands moving with surprising gentleness around plants, soil under fingernails, greenhouse spiral environment suggestion, warm natural light, character design sheet style, ultra detailed, 8k"),
    (14, "yuki", "photorealistic character concept art, Japanese girl age 8 on autism spectrum, small slight build, straight black hair cut with mathematical precision at exact jaw length, large intensely focused dark eyes that track like a camera, wearing simple solid-colored neat clothing with no patterns (sensory preference), holding mechanical pencil mid-tap, notebook open showing hand-drawn data charts nearby, objects arranged in perfect grid on desk surface, data stream digital environment suggestion, quiet precise atmosphere, character design sheet style, ultra detailed, 8k"),
    (15, "atlas", "photorealistic fantasy character concept art, enormous ancient stone golem twice human height, body made of visible geological rock layers (sandstone arms, dark basalt chest, granite legs with visible strata), entire surface covered in glowing gold cartographic map tattoos showing continents and star charts that pulse and shift, internal-light quartz crystal eyes, slow deliberate powerful presence, small moss and fern plants growing in body crevices, map room library environment suggestion, scale reference with doorway showing immense height, character design sheet style, ultra detailed, 8k"),
    (16, "grandmother-anaya", "photorealistic character concept art, West African grandmother storyteller elder, dark brown skin deeply lined with wisdom and warmth, natural silver-white hair in elegant braids or wrap, wearing rich traditional West African kente-inspired fabric dress in deep amber and gold, expressive storyteller's hands mid-gesture, ancient tree roots visible in background, warm firelight atmosphere, the most warm and welcoming presence imaginable, character design sheet style, ultra detailed, 8k"),
    (17, "felix-barbosa", "photorealistic character concept art, Brazilian-Portuguese dock worker poet man age 35, stocky muscular build, warm brown mixed skin, short fade haircut, both forearms covered in elaborate tattoo sonnets in visible script text, heavy dock-worker boots and rolled-up sleeves, rope coiled on one shoulder, calloused hands one foot mid-tap showing his natural rhythm, harbor dock background suggestion, character design sheet style, ultra detailed, 8k"),
    (18, "amara-diallo", "photorealistic character concept art, Senegalese-Malian female artisan educator age 40, tall elegant powerful posture, very dark skin with high cheekbones, hair in intricate braids with small metal phonetic script letter characters woven throughout like metallic beads, wearing forge leather apron over flowing West African indigo fabric, long precise elegant hands with calloused fingertips and small forge burn marks, letter forge background with glowing metal letters, character design sheet style, ultra detailed, 8k"),
    (19, "oliver-marsh", "photorealistic character concept art, English-Barbadian male librarian educator age 55 who is blind, warm tan-brown mixed skin, short grey hair, opaque pale grey eyes showing blindness while posture remains upright and confident, wearing practical wetsuit under a worn academic cardigan (underwater library adaptation), holds elegant walking cane with distinctive sculpted coral tip, moves with careful precise confidence, reading reef underwater library background suggestion, character design sheet style, ultra detailed, 8k"),
    (20, "lila-johansson-park", "photorealistic character concept art, Swedish-Korean female grammar teacher-engineer age 44, athletic medium build, light brown skin, dark hair in practical high ponytail, wearing a blazer over a work tool-belt (academic meets engineering), holds protractor and red pen simultaneously, standing in structural assessment posture as if evaluating load-bearing capacity of things, grammar bridge architecture background suggestion, character design sheet style, ultra detailed, 8k"),
    (21, "kwame-asante", "photorealistic character concept art, Ghanaian male naturalist linguist age 50, wiry alert build with tracker's watchfulness, dark skin, close-cropped hair with gray at temples, eyes scanning actively like spotting wildlife, wearing earth-toned fieldwork clothing, binoculars hanging around neck, worn leather notebook open to hand-drawn etymology word-tree diagram, vocabulary jungle with giant word-root trees background, character design sheet style, ultra detailed, 8k"),
    (22, "rosie-chen", "photorealistic character concept art, Chinese-American female railway conductor educator age 58, small compact efficient build, warm light brown skin, short gray hair under a classic conductor's cap she never removes, wearing an official vest with visible pocket watch chain, holds a train conductor's whistle as a teaching tool, economical precise movement posture, punctuation railway station background with giant period and comma signals, character design sheet style, ultra detailed, 8k"),
    (23, "theo-papadopoulos", "photorealistic character concept art, Greek-Australian male debate professor age 62, tall slightly desk-stooped posture, olive skin, thick prominent expressive grey eyebrows (the signature feature), thick grey hair, wearing a comfortably rumpled academic suit jacket over casual shirt, holds well-worn copy of Aristotle Rhetoric with multiple bookmarks, broad lawyer's gesture pose mid-argument, debate arena ancient Greek architecture background suggestion, character design sheet style, ultra detailed, 8k"),
    (24, "nadia-volkov", "photorealistic character concept art, Ukrainian young woman creative writing teacher age 26, thin watchful alert build, light skin, dark hair in genuinely messy bun, sharp blue-gray eyes with quiet intensity, wearing an oversized inherited lighthouse keeper's cream wool sweater over multiple layers underneath (displacement habit), holds small well-worn leather journal, ink stains on fingers, lighthouse with storm background suggestion, character design sheet style, ultra detailed, 8k"),
    (25, "benny-okafor-williams", "photorealistic character concept art, Nigerian-Welsh boy age 10 spelunker-miner, mixed dark-light brown skin, bright intelligent eyes and big smile, perpetually dirty from mining, wearing child-sized overalls and working headlamp, carries child-sized pickaxe with faintly glowing hilt, pockets bulging with collected crystal fragments containing visible letter-words, streak of sparkling crystal dust in his hair never washed out, spelling crystal cave mine background, character design sheet style, ultra detailed, 8k"),
    (26, "farah-al-rashid", "photorealistic character concept art, Iraqi-Jordanian female linguist gardener age 55, warm medium brown skin with deep smile lines, graying hair at temples under light practical hijab scarf, warm maternal presence, wearing layered practical garden clothing with apron, hands in garden soil or holding watering can, multilingual journal nearby open to page showing Arabic Latin Chinese scripts in different ink colors, translation garden with script-inscribed plants background, character design sheet style, ultra detailed, 8k"),
    (27, "captain-birch", "photorealistic character concept art, Mi'kmaq-European non-binary sea captain researcher age 60, weathered lean build, silver hair in short wind-cut style, mixed Indigenous and European angular features, perpetually evaluating assessing gaze, wearing worn navy peacoat over practical clothing, navigational compass on chain at chest, rough rope-calloused hands, nonfiction research ship background, character design sheet style, ultra detailed, 8k"),
    (28, "ines-moreau", "photorealistic character concept art, French-Haitian young woman illustrator educator age 32, petite build with intense focused energy, light brown skin, wild dark hair with charcoal sticks tucked in and pencils behind both ears, large extremely expressive eyes (her only voice - selective mutism), wearing paint-spattered artistic smock, hands stained with ink graphite and paint, sketchbook open in lap, holds up a quick sketch as communication, illustration cove artistic environment background, character design sheet style, ultra detailed, 8k"),
    (29, "hassan-yilmaz", "photorealistic character concept art, Turkish-Syrian male folklore storyteller age 58, distinguished presence, deep-set dark eyes, carefully trimmed grey beard, wearing traditional Ottoman-Syrian fusion clothing with embroidered vest loose trousers and draped scarf, always holds a small tulip-shaped Turkish tea glass, graceful storyteller's hands, moves with unhurried merchant's familiarity, folklore bazaar market background, character design sheet style, ultra detailed, 8k"),
    (30, "wren-calloway", "photorealistic character concept art, non-binary Appalachian editor educator age 38, angular face with sharp eyes, short-cropped hair (show auburn/brown variant), wearing warm flannel shirt boots and worn cardigan, pen behind one ear, reading glasses pushed up onto forehead never worn on face, red ink stains on fingers, a trained intelligent raven named Markup perched on their shoulder looking critically at everything, editing tower environment with manuscripts background, character design sheet style, ultra detailed, 8k"),
    (31, "tia-carmen-herrera", "photorealistic character concept art, warm Latin American market woman educator middle age, deep warm brown skin, colorful traditional market vendor clothing with apron, expressive warm face, perpetually in motion with goods and scales nearby, market square background with stalls, character design sheet style, ultra detailed, 8k"),
    (32, "mr-abernathy", "photorealistic character concept art, British-Jamaican male bank educator age 65, impeccably dressed in three-piece suit with pocket watch chain, dark brown skin, salt-and-pepper neatly trimmed hair, reading glasses on a chain, ramrod upright posture, holding a small potted plant with surprising gentleness (his one informal touch), savings vault bank background, character design sheet style, ultra detailed, 8k"),
    (33, "priya-nair", "photorealistic character concept art, Indian-Malaysian female chef-educator age 42, energetic quick-moving medium build, warm brown skin, dark hair in practical plait, wearing chef's apron with flour handprints, hands actively chopping stirring counting gesturing simultaneously, measuring cups and kitchen scales visible as teaching props, budget kitchen environment, character design sheet style, ultra detailed, 8k"),
    (34, "diego-montoya-silva", "photorealistic character concept art, Colombian-Chilean male entrepreneur educator age 32, wiry animated build, dark curly slightly messy hair, warm medium brown skin, wearing workshop apron covered in prototype sketches and hot glue burns, visibly high energy bouncing-when-he-talks pose, desk behind showing organized creative chaos of projects, inventor's workshop background, character design sheet style, ultra detailed, 8k"),
    (35, "auntie-bee", "photorealistic character concept art, Jamaican-Trinidadian elder woman community educator, warm round build with deep carved laugh lines, rich dark brown skin, hair in vibrant colorful headwrap, wearing an apron, hands always in motion cooking sewing tending, enormous warm wooden community table beside her with space for many, meadow outdoor community setting, character design sheet style, ultra detailed, 8k"),
    (36, "jin-ho-park", "photorealistic character concept art, Korean male investor-gardener educator age 55, neat patient deliberate presence, light skin, precisely combed graying hair, wire-rimmed glasses, wearing a gardener's vest over formal button-down shirt (finance meets horticulture aesthetic), checking a growing plant portfolio with the same care he once gave stocks, greenhouse with growing investment plants background, character design sheet style, ultra detailed, 8k"),
    (37, "nia-oduya", "photorealistic character concept art, Kenyan-Nigerian female minimalist educator age 45, lean precise build, dark brown skin, natural short hair, sharp observant eyes, wearing simple clean rotating capsule wardrobe outfit with no jewelry except a functional watch, carrying a small deliberately minimal bag, environment shows exactly 42 purposefully labeled items, needs and wants bridge background, character design sheet style, ultra detailed, 8k"),
    (38, "tomas-reyes", "photorealistic character concept art, Puerto Rican-Peruvian male monetary historian educator age 50, animated expressive perpetually amused energy, warm medium brown skin, graying curly hair, wide genuine smile, wearing clothing mixing contemporary and historical styles, hands pulling out historical currency replicas (cowrie shells Yap stone models salt chunks) from pockets to show, barter dock marketplace historical background, character design sheet style, ultra detailed, 8k"),
    (39, "elsa-lindgren", "photorealistic character concept art, Swedish female debt education specialist age 48, tall composed precise presence, light skin, blonde hair in exact precise bob cut, ice-blue eyes, wearing high-quality wool coat gloves and boots for cold environment, carries transparent glass tablet displaying live financial calculations, economical deliberate posture nothing wasted, debt glacier ice environment background, character design sheet style, ultra detailed, 8k"),
    (40, "babatunde-afolabi", "photorealistic character concept art, Nigerian male career educator age 52, tall warm adaptable presence, dark brown skin, shaved head, broad genuine smile, wearing practical clothing that hints at multiple former careers simultaneously, carries a folder with framed résumés for different jobs displayed proudly, job fair career event background, character design sheet style, ultra detailed, 8k"),
    (41, "mei-lin-wu", "photorealistic character concept art, Taiwanese-American female philanthropist educator age 60, elegant no-nonsense quietly powerful presence, light warm skin, silver-streaked hair in simple precise cut, sharp eyes behind frameless glasses, wearing understated quality clothing, tablet showing impact metrics and data, single jade pendant on simple chain from grandmother, charity harbor coastal backdrop, character design sheet style, ultra detailed, 8k"),
    (42, "sam-worthington", "photorealistic character concept art, Australian-Maori male tax educator age 45, athletic solid animated build, warm brown skin, expressive comedic face with wide grin, traditional ta moko Maori tattoo on one forearm, wearing office tie loosened and sleeves rolled up (between formal and comedian), tax office with welcoming community feel background, character design sheet style, ultra detailed, 8k"),
    (43, "the-librarian", "photorealistic fantasy character concept art, ageless librarian of infinite knowledge, neither young nor old, warm presence of accumulated wisdom, wearing library keeper clothing across multiple eras simultaneously (layers of time), surrounded by self-organizing floating books in every language, great archive interior with impossible scale background, character design sheet style, ultra detailed, 8k"),
    (44, "kenzo-nakamura-osei", "photorealistic character concept art, Japanese-Ghanaian male design thinker age 36, lean observant build, mixed East Asian and West African features, thoughtful eyes always processing, wearing elegant clothing that fuses Japanese minimalist clean lines with Ghanaian kente bold color accents, tool belt holding small materials from different academic worlds, always sketching in notebook, crossroads workshop background, character design sheet style, ultra detailed, 8k"),
    (45, "solana-bright", "photorealistic character concept art, Afro-Brazilian female expedition scientist age 30, athletic outdoor-ready build radiating energy, deep brown skin, natural hair under wide-brimmed sun hat, bright scanning eyes, wearing expedition clothing cargo pants hiking boots scientific vest with many pockets, compass hanging from belt that spins toward interesting questions, discovery trail outdoor environment background, character design sheet style, ultra detailed, 8k"),
    (46, "old-rowan", "photorealistic fantasy character concept art, sentient ancient oak tree character, enormous gnarled trunk with natural face formation in the bark (knothole eyes glowing with intelligence, bark-gash mouth), roots spreading visibly above ground some glowing with connected knowledge, leaves inscribed with visible philosophical questions, mushrooms and moss growing in text patterns, crown orbited by firefly light particles, ancient magical grove background, character design sheet style, ultra detailed, 8k"),
    (47, "hana-bergstrom", "photorealistic character concept art, Swedish-Korean female social-emotional educator age 40, warm open grounded presence, light-medium warm skin, warm brown eyes with depth of emotion and slight moisture suggesting she cries easily, wearing comfortable earth-toned garden clothing with soil on hands, small wrist tattoo showing willow tree beside sunflower (grief and joy coexisting), wellness garden background, character design sheet style, ultra detailed, 8k"),
    (48, "rami-al-farsi", "photorealistic character concept art, Omani-Egyptian male archaeological historian age 58, distinguished scholarly weathered look, warm olive-brown skin, silver-streaked dark hair neatly groomed, trimmed silver-dark beard, reading glasses on forehead, wearing tweed academic jacket over khaki expedition pants, carries magnifying glass and well-worn cuneiform notebook, time gallery archaeological museum background, character design sheet style, ultra detailed, 8k"),
    (49, "luna-esperanza", "photorealistic character concept art, young Latina music teacher, warm brown skin, flowing natural hair, surrounded by musical instruments that seem to play themselves in response to her presence, music meadow environment where natural sounds become visible as color, peaceful joyful musical expression, character design sheet style, ultra detailed, 8k"),
    (50, "the-compass", "photorealistic fantasy character concept art, androgynous guide figure who appears to everyone differently, neutral warm welcoming presence, features that feel somehow familiar to every viewer, compass rose motif integrated into clothing or visible as a glow pattern, radiant warmth suggesting I will help you find your way, all-worlds environment suggestion, character design sheet style, ultra detailed, 8k"),
]

HEADERS = {
    "Authorization": f"Key {API_KEY}",
    "Content-Type": "application/json",
}


def api_post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers=HEADERS,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, body


def api_get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, body


def download_image(url, path):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=60) as resp:
        with open(path, "wb") as f:
            f.write(resp.read())


def generate_one(num, slug, prompt):
    """Submit, poll, download. Returns (image_path, error_string)."""
    model_path = MODEL
    submit_url = f"{BASE_URL}/{model_path}"

    # Submit
    payload = {
        "prompt": prompt,
        "image_size": {"width": 768, "height": 1024},
        "num_images": 1,
        "guidance_scale": 3.5,
        "num_inference_steps": 28,
        "enable_safety_checker": True,
        "output_format": "jpeg",
    }
    status, resp = api_post(submit_url, payload)
    if status == 402:
        return None, "CREDIT_LIMIT_REACHED"
    if status == 429:
        return None, "RATE_LIMITED"
    if status not in (200, 201):
        return None, f"Submit failed: HTTP {status} — {resp}"

    request_id = resp.get("request_id", "")
    if not request_id:
        return None, f"No request_id in response: {resp}"

    # Use URLs returned by submit (they drop the /v1.1 suffix in polling)
    status_url = resp.get("status_url") or f"{BASE_URL}/fal-ai/flux-pro/requests/{request_id}/status"
    result_url = resp.get("response_url") or f"{BASE_URL}/fal-ai/flux-pro/requests/{request_id}"

    for attempt in range(120):
        time.sleep(2)
        s, poll_resp = api_get(status_url)
        # 200 = COMPLETED, 202 = IN_PROGRESS/IN_QUEUE — both are valid
        if s not in (200, 202):
            return None, f"Poll failed HTTP {s}: {poll_resp}"
        if not isinstance(poll_resp, dict):
            return None, f"Unexpected poll response: {poll_resp}"
        current = poll_resp.get("status", "UNKNOWN")
        if current == "COMPLETED":
            break
        if current in ("FAILED", "CANCELLED"):
            return None, f"Generation {current}: {poll_resp.get('error', '')}"
        if attempt % 10 == 9:
            print(f"    [{num:02d}] still waiting... ({(attempt+1)*2}s)")
    else:
        return None, "Timed out after 240s"

    # Fetch result
    s, result = api_get(result_url)
    if s != 200:
        return None, f"Result fetch failed HTTP {s}"

    images = result.get("images", [])
    if not images:
        return None, "No images in result"

    image_url = images[0].get("url", "")
    if not image_url:
        return None, "No URL in image result"

    # Download
    out_path = OUTPUT_DIR / f"kindler-{num:02d}-{slug}.jpg"
    download_image(image_url, out_path)
    return str(out_path), None


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Check which ones already exist
    done = set()
    for f in OUTPUT_DIR.glob("kindler-*.jpg"):
        parts = f.stem.split("-")
        if len(parts) >= 2:
            try:
                done.add(int(parts[1]))
            except ValueError:
                pass

    total = len(CHARACTERS)
    generated = 0
    failed = 0
    results = {}  # num -> (path or None, error or None)

    print(f"Starting generation: {total} characters, {len(done)} already done")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)

    for num, slug, prompt in CHARACTERS:
        if num in done:
            print(f"  [{num:02d}] ✅ SKIP (already exists)")
            results[num] = (str(OUTPUT_DIR / f"kindler-{num:02d}-{slug}.jpg"), None)
            continue

        print(f"  [{num:02d}] Generating: {slug}...", end="", flush=True)
        path, err = generate_one(num, slug, prompt)

        if err == "CREDIT_LIMIT_REACHED":
            print(f"\n\n⛔ CREDIT LIMIT REACHED at character {num} ({slug})")
            print(f"Generated {generated} new images this run.")
            break
        elif err == "RATE_LIMITED":
            print(f"\n⚠️  Rate limited at character {num}. Waiting 60s...")
            time.sleep(60)
            # Retry once
            path, err = generate_one(num, slug, prompt)
            if err:
                print(f" ❌ FAIL: {err}")
                failed += 1
                results[num] = (None, err)
                continue

        if err:
            print(f" ❌ FAIL: {err}")
            failed += 1
            results[num] = (None, err)
        else:
            print(f" ✅ {Path(path).name}")
            generated += 1
            results[num] = (path, None)

    print("=" * 60)
    print(f"Done. Generated: {generated}, Failed: {failed}, Skipped: {len(done)}")

    # Write results JSON for the brief updater
    results_file = OUTPUT_DIR / "generation-results.json"
    with open(results_file, "w") as f:
        json.dump({str(k): {"path": v[0], "error": v[1]} for k, v in results.items()}, f, indent=2)
    print(f"Results logged to: {results_file}")


if __name__ == "__main__":
    main()
