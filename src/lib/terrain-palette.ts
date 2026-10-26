import type { Elevation, TerrainColor } from "@/lib/hex-grid";

export const TERRAIN_COLOR_LABELS: Record<TerrainColor, string> = {
  gray: "Gris",
  orange: "Orange",
  green: "Vert",
  blue: "Bleu",
};

export const TERRAIN_PALETTE: Record<TerrainColor, Record<Elevation, string>> = {
  gray: {
    1: "#d9dde2",
    2: "#b1bac4",
    3: "#8994a2",
    4: "#647182",
  },
  orange: {
    1: "#f9d29d",
    2: "#f2af62",
    3: "#dc8936",
    4: "#b96823",
  },
  green: {
    1: "#c9e4ad",
    2: "#9ec77d",
    3: "#70a553",
    4: "#477c38",
  },
  blue: {
    1: "#b9dff1",
    2: "#85c0df",
    3: "#5198c2",
    4: "#286d98",
  },
};

export function getTileColor(color: TerrainColor, elevation: Elevation): string {
  const shade = TERRAIN_PALETTE[color]?.[elevation];
  if (!shade) {
    throw new RangeError(`Invalid terrain color or elevation: ${color}, ${elevation}`);
  }
  return shade;
}
