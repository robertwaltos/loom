/**
 * Design Tokens — Colour System.
 *
 * Bible v1.4: Light-primary palette. Warm parchment canvas with ink type.
 * Gold is editorial accent on light. Dark accents used sparingly.
 *
 * "Every UI component should feel like reading a beautifully designed
 * magazine about the most important civilisational event in human history."
 */

export const COLOURS = {
  // -- PRIMARY SURFACES (light system) --
  dawnWhite:      '#F8F4EE',  // Primary background — warm, not cold
  parchment:      '#EDE8DF',  // Secondary surface, panels, cards
  cream:          '#E2D9CA',  // Tertiary surface, borders, dividers

  // -- GOLD SYSTEM --
  chronicleGold:  '#C49A3C',  // Primary accent — used, not bright
  goldBright:     '#D4AA4C',  // Hover states
  goldDim:        '#9A7A2C',  // Secondary gold — labels, eyebrows
  goldPale:       '#EDD98A',  // Subtle gold — highlights, backgrounds

  // -- INK SYSTEM --
  deepInk:        '#1A1410',  // Primary text — warm, not black
  inkMid:         '#2E2420',  // Body text
  dim:            '#8A7A6A',  // Secondary text, captions
  dimLight:       '#B0A090',  // Disabled, placeholder

  // -- ACCENT COLOURS --
  latticeBlue:    '#2A5C8A',  // The Lattice — clear sky
  latticePale:    '#4A8ABE',  // Lattice hover
  resonanceTeal:  '#1A7A6A',  // Energy, ZPE, life
  tealPale:       '#3AAA8A',  // Teal hover
  surveyCopper:   '#A05C28',  // Survey Corps, exploration
  ascendancyRed:  '#8A2020',  // Threat, danger

  // -- DEPTH ACCENTS (use sparingly) --
  nightSky:       '#0D1525',  // Log blocks, terminal elements
  voidDeep:       '#060A12',  // Absolute dark — Lattice transit only

  // -- SEMANTIC --
  border:         'rgba(26,20,16,0.10)',
  borderMed:      'rgba(26,20,16,0.18)',
  borderGold:     'rgba(196,154,60,0.25)',
} as const;

export type ColourKey = keyof typeof COLOURS;
