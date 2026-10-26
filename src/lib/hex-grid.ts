export type TerrainStatus = "definitive" | "ghost";

export interface AxialCoordinate {
  q: number;
  r: number;
}

export interface TerrainTile extends AxialCoordinate {
  id: string;
  terrainId: string;
  baseColor: "gray" | "orange" | "green" | "blue";
  elevation: 1 | 2 | 3 | 4;
  habitat: string | null;
}

export interface Terrain {
  id: string;
  position: AxialCoordinate;
  status: TerrainStatus;
  tiles: TerrainTile[];
}

export const TERRAIN_RADIUS = 2;
export const TERRAIN_TILE_COUNT = 19;

export const TERRAIN_TILE_OFFSETS: readonly AxialCoordinate[] = (() => {
  const coordinates: AxialCoordinate[] = [];
  for (let q = -TERRAIN_RADIUS; q <= TERRAIN_RADIUS; q += 1) {
    const minR = Math.max(-TERRAIN_RADIUS, -q - TERRAIN_RADIUS);
    const maxR = Math.min(TERRAIN_RADIUS, -q + TERRAIN_RADIUS);
    for (let r = minR; r <= maxR; r += 1) {
      coordinates.push({ q, r });
    }
  }
  return coordinates;
})();

const FIRST_NEIGHBOR: AxialCoordinate = { q: 5, r: -2 };

function rotateAxial({ q, r }: AxialCoordinate): AxialCoordinate {
  return { q: -r, r: q + r };
}

export function generateTerrainCoordinates(
  position: AxialCoordinate = { q: 0, r: 0 },
): AxialCoordinate[] {
  return TERRAIN_TILE_OFFSETS.map(({ q, r }) => ({
    q: position.q + q,
    r: position.r + r,
  }));
}

export function getNeighborPositions(
  position: AxialCoordinate,
): AxialCoordinate[] {
  const neighbors: AxialCoordinate[] = [];
  let direction = FIRST_NEIGHBOR;

  for (let index = 0; index < 6; index += 1) {
    neighbors.push({
      q: position.q + direction.q,
      r: position.r + direction.r,
    });
    direction = rotateAxial(direction);
  }

  return neighbors;
}

export function hasTerrainOverlap(
  position: AxialCoordinate,
  terrains: readonly Terrain[],
): boolean {
  const occupied = new Set(
    terrains.flatMap((terrain) =>
      terrain.tiles.map(({ q, r }) => `${q},${r}`),
    ),
  );
  return generateTerrainCoordinates(position).some(({ q, r }) =>
    occupied.has(`${q},${r}`),
  );
}

export function isValidTerrainPlacement(
  position: AxialCoordinate,
  terrains: readonly Terrain[],
): boolean {
  if (hasTerrainOverlap(position, terrains)) {
    return false;
  }

  return terrains.some((terrain) =>
    getNeighborPositions(terrain.position).some(
      (neighbor) => neighbor.q === position.q && neighbor.r === position.r,
    ),
  );
}

export function createTerrain(
  id: string,
  position: AxialCoordinate,
  status: TerrainStatus,
): Terrain {
  return {
    id,
    position,
    status,
    tiles: generateTerrainCoordinates(position).map(({ q, r }) => ({
      id: `${id}:${q},${r}`,
      terrainId: id,
      q,
      r,
      baseColor: "gray",
      elevation: 1,
      habitat: null,
    })),
  };
}
