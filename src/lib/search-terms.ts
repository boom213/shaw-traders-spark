/**
 * Shoppers here type part names in Hinglish and in many spellings.
 * These rules turn what they type into the words the catalogue actually uses.
 */
const SYNONYMS: Record<string, string> = {
  betri: "battery",
  batri: "battery",
  battry: "battery",
  bettery: "battery",
  batery: "battery",
  cell: "battery",
  chargar: "charger",
  charjer: "charger",
  charger: "charger",
  chager: "charger",
  moter: "motor",
  motar: "motor",
  mottor: "motor",
  controler: "controller",
  contoller: "controller",
  kantroler: "controller",
  break: "brake",
  brek: "brake",
  tayar: "tyre",
  tayer: "tyre",
  tire: "tyre",
  tayre: "tyre",
  pahiya: "wheel",
  chakka: "wheel",
  wheal: "wheel",
  light: "light",
  lite: "light",
  headlite: "headlight",
  hedlight: "headlight",
  indicater: "indicator",
  mirrer: "mirror",
  sheesha: "mirror",
  seet: "seat",
  cedt: "seat",
  shokup: "suspension",
  shocker: "suspension",
  shockup: "suspension",
  suspention: "suspension",
  hornn: "horn",
  bharan: "horn",
  wire: "wiring",
  wireing: "wiring",
  lithum: "lithium",
  lithuim: "lithium",
  lithiam: "lithium",
  volt: "v",
  volts: "v",
  amp: "ah",
  amps: "ah",
  ampere: "ah",
};

/** Cleans up a shopper's search text and fixes common misspellings. */
export function normaliseSearch(raw: string): string {
  const words = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s.+-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SYNONYMS[w] ?? w);
  return words.join(" ").trim();
}
