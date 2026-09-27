export const CATEGORY_ICON_KEYS = [
  "battery-charging",
  "plug-zap",
  "cog",
  "cpu",
  "shield",
  "disc-3",
  "circle-dot",
  "waves",
  "lightbulb",
  "footprints",
  "lock",
  "zap",
  "cable",
  "package",
  "circuit-board",
  "gauge",
  "monitor",
  "refresh-cw",
  "wrench",
  "unplug",
  "armchair",
  "volume-2",
  "circle",
  "nut",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export const CATEGORY_ICON_LABELS: Record<CategoryIconKey, string> = {
  "battery-charging": "Battery",
  "plug-zap": "Charger",
  cog: "Motor / gear",
  cpu: "Controller",
  shield: "Body panel",
  "disc-3": "Brake disc",
  "circle-dot": "Wheel",
  waves: "Suspension",
  lightbulb: "Light",
  footprints: "Footrest",
  lock: "Lock",
  zap: "Electrical",
  cable: "Cable",
  package: "Package",
  "circuit-board": "Circuit board",
  gauge: "Throttle / gauge",
  monitor: "Display",
  "refresh-cw": "Converter",
  wrench: "Tool",
  unplug: "Connector",
  armchair: "Seat",
  "volume-2": "Horn",
  circle: "Mirror",
  nut: "Hardware",
};

export function isCategoryIconKey(value: string): value is CategoryIconKey {
  return (CATEGORY_ICON_KEYS as readonly string[]).includes(value);
}