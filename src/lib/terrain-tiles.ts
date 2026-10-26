import type { Elevation, Terrain, TerrainColor, TerrainTile } from "@/lib/hex-grid";

function updateTile(
  terrains: readonly Terrain[],
  terrainId: string,
  tileId: string,
  update: (tile: TerrainTile) => TerrainTile,
): Terrain[] {
  let found = false;

  const updatedTerrains = terrains.map((terrain) => {
    if (terrain.id !== terrainId) return terrain;

    const tiles = terrain.tiles.map((tile) => {
      if (tile.id !== tileId) return tile;
      found = true;
      return update(tile);
    });

    return tiles.some((tile, index) => tile !== terrain.tiles[index])
      ? { ...terrain, tiles }
      : terrain;
  });

  if (!found) {
    throw new Error(`Tile "${tileId}" was not found in terrain "${terrainId}".`);
  }

  return updatedTerrains;
}

export function setTileColor(
  terrains: readonly Terrain[],
  terrainId: string,
  tileId: string,
  terrainColor: TerrainColor,
): Terrain[] {
  return updateTile(terrains, terrainId, tileId, (tile) => ({
    ...tile,
    terrainColor,
  }));
}

export function setTileElevation(
  terrains: readonly Terrain[],
  terrainId: string,
  tileId: string,
  elevation: Elevation,
): Terrain[] {
  if (![1, 2, 3, 4].includes(elevation)) {
    throw new RangeError(`Elevation must be between 1 and 4; received ${elevation}.`);
  }

  return updateTile(terrains, terrainId, tileId, (tile) => ({
    ...tile,
    elevation,
  }));
}

export function resetTile(
  terrains: readonly Terrain[],
  terrainId: string,
  tileId: string,
): Terrain[] {
  return updateTile(terrains, terrainId, tileId, (tile) => ({
    ...tile,
    terrainColor: "gray",
    elevation: 1,
    habitat: null,
  }));
}
