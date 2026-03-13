/**
 * Content Entries — Magnet Hills
 * World: The Magnet Hills | Guide: Lena Sundström | Subject: Physics / Forces & Motion
 *
 * Four published entries spanning the history of physics:
 *   1. Isaac Newton and the Laws of Motion — the rules that run everything
 *   2. Marie Curie and radioactivity — discovery in a leaky shed
 *   3. Ole Rømer and the speed of light — timing Jupiter's moons
 *   4. Foucault's Pendulum — proving Earth rotates without looking at the sky
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Newton's Laws of Motion (Tier 1 — ages 5-6) ──────────

export const ENTRY_NEWTON_LAWS_OF_MOTION: RealWorldEntry = {
  id: 'entry-newton-laws-of-motion',
  type: 'discovery',
  title: "Three Rules That Explain How Everything Moves",
  year: 1687,
  yearDisplay: '1687 CE',
  era: 'enlightenment',
  descriptionChild:
    "A falling apple (maybe) made Newton wonder why things fall down. He worked out three rules that explain how everything moves — from a rolling ball to a planet orbiting a star. His rules were so good they guided spacecraft to the Moon 280 years later.",
  descriptionOlder:
    "Newton's Principia Mathematica unified Earth physics and planetary astronomy for the first time. Einstein later showed Newton was an approximation — correct at low speeds, wrong near the speed of light. A brilliant approximation is still brilliant.",
  descriptionParent:
    "Isaac Newton's Principia Mathematica (1687) established the three laws of motion and universal gravitation, unifying terrestrial and celestial mechanics for the first time. His framework was the dominant physics model for 230 years until Einstein's general relativity refined it for extreme speeds and gravitational fields. Newton's laws remain accurate enough to guide spacecraft to other planets. Teaching children that 'the best scientific theory we had was eventually replaced by a better one' introduces the self-correcting nature of science.",
  realPeople: ['Isaac Newton'],
  quote: "If I have seen further it is by standing on the shoulders of giants.",
  quoteAttribution: 'Isaac Newton, 1675',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['laws of motion', 'gravity', 'forces', 'classical mechanics', 'physics'],
  worldId: 'magnet-hills',
  guideId: 'lena-sundstrom',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-curie-radioactivity'],
  funFact:
    'Newton invented calculus at age 23 while Cambridge was closed due to plague. He had too much time alone to think. He kept it secret for 20 years.',
  imagePrompt:
    'Rolling hillside with shimmering magnetic field lines, a golden apple suspended in mid-fall against aurora-like waves of light',
  status: 'published',
};

// ─── Entry 2: Marie Curie and Radioactivity (Tier 2 — ages 7-8) ────

export const ENTRY_CURIE_RADIOACTIVITY: RealWorldEntry = {
  id: 'entry-curie-radioactivity',
  type: 'discovery',
  title: "Discovery in a Leaky Shed",
  year: 1898,
  yearDisplay: '1898 CE',
  era: 'industrial',
  descriptionChild:
    "Marie Curie discovered two brand-new elements — polonium and radium — and proved that atoms could release energy on their own. She did all this in a leaky shed that was too hot in summer and too cold in winter, with equipment she bought herself.",
  descriptionOlder:
    "Curie was the first woman to win a Nobel Prize. She is still the only person to win Nobels in two different sciences (Physics and Chemistry). Her notebooks are so radioactive they are stored in lead-lined boxes and require a waiver to handle.",
  descriptionParent:
    "Marie Curie's (1867–1934) isolation of polonium and radium established the field of radioactivity and earned her Nobel Prizes in Physics (1903, shared) and Chemistry (1911). Her work was conducted under conditions that modern labs would consider dangerous — she carried test tubes of radioactive material in her pockets. Curie's story teaches perseverance under adversity but also the importance of safety standards that evolved from understanding the dangers she faced. Her notebooks remain too radioactive to handle without protection over a century later.",
  realPeople: ['Marie Curie', 'Pierre Curie'],
  quote: "Nothing in life is to be feared, it is only to be understood.",
  quoteAttribution: 'Marie Curie',
  geographicLocation: { lat: 48.8566, lng: 2.3522, name: 'Paris, France' },
  continent: 'Europe',
  subjectTags: ['radioactivity', 'elements', 'Nobel Prize', 'atomic energy', 'women in science'],
  worldId: 'magnet-hills',
  guideId: 'lena-sundstrom',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-newton-laws-of-motion'],
  unlocks: ['entry-romer-speed-of-light'],
  funFact:
    'Her personal cookbook is stored alongside her scientific notebooks in Paris — both too radioactive to handle safely. She ate at her lab bench most days.',
  imagePrompt:
    'Glowing mineral specimens in crystal display cases on magnetic hilltop, shimmering aurora fields pulsing with radioactive glow',
  status: 'published',
};

// ─── Entry 3: Ole Rømer and the Speed of Light (Tier 2 — ages 7-8) ──

export const ENTRY_ROMER_SPEED_OF_LIGHT: RealWorldEntry = {
  id: 'entry-romer-speed-of-light',
  type: 'discovery',
  title: "The First Person to Know Light Has a Speed",
  year: 1676,
  yearDisplay: '1676 CE',
  era: 'enlightenment',
  descriptionChild:
    "A Danish astronomer noticed that eclipses of one of Jupiter's moons happened earlier or later than expected depending on where Earth was in its orbit. He realised he was watching light take time to travel. He was the first person to know that light has a speed.",
  descriptionOlder:
    "Rømer's measurement was about 25% off from the true value (299,792 km/s), but the method was revolutionary — he proved light travels at a finite speed using only astronomical timing. The Royal Society didn't accept his conclusion until after his death.",
  descriptionParent:
    "Ole Rømer's 1676 observation that the timing of Io's eclipses varied with Earth's orbital position was the first empirical demonstration that light has a finite speed. His estimate was roughly 25% low (he calculated ~220,000 km/s vs. the true ~300,000 km/s), but the conceptual breakthrough was transformative. It took decades for the scientific establishment to accept his finding — a powerful example of how correct observations can be rejected when they challenge consensus. The Speed Track in Magnet Hills commemorates scientists vindicated posthumously.",
  realPeople: ['Ole Rømer'],
  quote: "The delay is not in the eclipse, but in the light.",
  quoteAttribution: 'Ole Rømer (paraphrased), 1676',
  geographicLocation: { lat: 48.8566, lng: 2.3522, name: 'Paris, France' },
  continent: 'Europe',
  subjectTags: ['speed of light', 'astronomy', 'measurement', 'Jupiter', 'scientific method'],
  worldId: 'magnet-hills',
  guideId: 'lena-sundstrom',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-newton-laws-of-motion'],
  unlocks: ['entry-foucault-pendulum'],
  funFact:
    "Rømer's measurements were dismissed as clock error for decades. History eventually ruled entirely in his favour. The Speed Track's walls are lined with the names of scientists vindicated posthumously.",
  imagePrompt:
    'Hilltop observatory with Jupiter visible in sky, shimmering light beams traveling across magnetic field lines showing timing delays',
  status: 'published',
};

// ─── Entry 4: Foucault's Pendulum (Tier 3 — ages 9-10) ─────────────

export const ENTRY_FOUCAULT_PENDULUM: RealWorldEntry = {
  id: 'entry-foucault-pendulum',
  type: 'discovery',
  title: "Proving Earth Rotates Without Looking at the Sky",
  year: 1851,
  yearDisplay: '1851 CE',
  era: 'industrial',
  descriptionChild:
    "In 1851, Léon Foucault hung a huge pendulum from the dome of the Panthéon. During the day, it appeared to slowly rotate in a circle — though nobody was pushing it. It was proof, visible to anyone who stood and watched, that the Earth itself was spinning beneath it.",
  descriptionOlder:
    "The pendulum wasn't moving — the building was. As Earth rotated beneath the pendulum, its plane of swing appeared to shift. It was the first direct visual proof of Earth's rotation that didn't require looking at the sky. You could prove it in a room.",
  descriptionParent:
    "Léon Foucault's 1851 demonstration at the Paris Panthéon provided the first direct, non-astronomical proof of Earth's rotation. The pendulum's swing plane remained fixed while the Earth rotated beneath it, causing an apparent precession. At 48.8° latitude (Paris), the plane rotated about 270° in 24 hours. At the poles it would complete 360°; at the equator, zero. The experiment teaches frame of reference — a concept foundational to both Newtonian and Einsteinian physics. The Magnet Hills' central Pendulum Forest is set at exactly 45° latitude in-world.",
  realPeople: ['Léon Foucault'],
  quote: "The pendulum stayed still. It was the world that moved.",
  quoteAttribution: 'Lena Sundström, Guide of the Magnet Hills',
  geographicLocation: { lat: 48.8462, lng: 2.3464, name: 'Panthéon, Paris, France' },
  continent: 'Europe',
  subjectTags: ['Earth rotation', 'pendulum', 'frame of reference', 'physics demonstration', 'Coriolis effect'],
  worldId: 'magnet-hills',
  guideId: 'lena-sundstrom',
  adventureType: 'natural_exploration',
  difficultyTier: 3,
  prerequisites: ['entry-curie-radioactivity', 'entry-romer-speed-of-light'],
  unlocks: [],
  funFact:
    "At the North Pole, a Foucault pendulum's plane would rotate a full 360° in 24 hours. At the equator, it would not appear to rotate at all. The Magnet Hills sit at exactly 45° in-world — halfway.",
  imagePrompt:
    'Enormous brass pendulum swinging in a domed chamber atop a magnetic hill, aurora light streaming through the dome, traced path lines glowing on the floor',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const MAGNET_HILLS_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_NEWTON_LAWS_OF_MOTION,
  ENTRY_CURIE_RADIOACTIVITY,
  ENTRY_ROMER_SPEED_OF_LIGHT,
  ENTRY_FOUCAULT_PENDULUM,
] as const;

export const MAGNET_HILLS_ENTRY_IDS: readonly string[] =
  MAGNET_HILLS_ENTRIES.map((e) => e.id);
