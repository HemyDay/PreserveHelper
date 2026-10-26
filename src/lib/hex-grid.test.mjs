import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTerrain,
  generateTerrainCoordinates,
  getNeighborPositions,
  hasTerrainOverlap,
  isValidTerrainPlacement,
} from "./hex-grid.ts";
import { getTileColor, TERRAIN_PALETTE } from "./terrain-palette.ts";
import {
  resetTile,
  setTileColor,
  setTileElevation,
} from "./terrain-tiles.ts";

const origin = { q: 0, r: 0 };
const firstTerrain = createTerrain("first", origin, "definitive");

test("generates exactly 19 coordinates in the expected 3/4/5/4/3 rows", () => {
  const coordinates = generateTerrainCoordinates();
  const rows = new Map();

  for (const coordinate of coordinates) {
    rows.set(coordinate.r, (rows.get(coordinate.r) ?? 0) + 1);
  }

  assert.equal(coordinates.length, 19);
  assert.deepEqual(
    [...rows.entries()].sort(([left], [right]) => left - right).map(([, count]) => count),
    [3, 4, 5, 4, 3],
  );
  assert.equal(new Set(coordinates.map(({ q, r }) => `${q},${r}`)).size, 19);
});

test("returns six unique neighboring terrain positions", () => {
  const neighbors = getNeighborPositions(origin);

  assert.equal(neighbors.length, 6);
  assert.equal(new Set(neighbors.map(({ q, r }) => `${q},${r}`)).size, 6);
  assert.ok(
    neighbors.every(
      ({ q, r }) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) === 5,
    ),
  );

  const tileDirections = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];
  for (const neighbor of neighbors) {
    const neighborTiles = new Set(
      generateTerrainCoordinates(neighbor).map(({ q, r }) => `${q},${r}`),
    );
    const touchingPairs = firstTerrain.tiles.filter((tile) =>
      tileDirections.some(({ q, r }) => neighborTiles.has(`${tile.q + q},${tile.r + r}`)),
    );
    assert.equal(touchingPairs.length, 3);
  }
});

test("detects overlapping terrain tiles", () => {
  assert.equal(hasTerrainOverlap(origin, [firstTerrain]), true);
  assert.equal(hasTerrainOverlap(getNeighborPositions(origin)[0], [firstTerrain]), false);
});

test("only allows a non-overlapping terrain against an existing side", () => {
  const neighbor = getNeighborPositions(origin)[0];
  const isolated = { q: 20, r: 20 };

  assert.equal(isValidTerrainPlacement(neighbor, [firstTerrain]), true);
  assert.equal(isValidTerrainPlacement(origin, [firstTerrain]), false);
  assert.equal(isValidTerrainPlacement(isolated, [firstTerrain]), false);
  assert.equal(
    isValidTerrainPlacement(neighbor, [
      firstTerrain,
      createTerrain("second", neighbor, "ghost"),
    ]),
    false,
  );
});

test("creates each tile gray at elevation one with terrain association", () => {
  const terrain = createTerrain("initial", origin, "definitive");
  assert.equal(terrain.tiles.length, 19);
  assert.ok(
    terrain.tiles.every(
      (tile) =>
        tile.terrainColor === "gray" &&
        tile.elevation === 1 &&
        tile.habitat === null &&
        tile.terrainId === terrain.id,
    ),
  );
});

test("maps every terrain color and elevation to its configured shade", () => {
  for (const color of ["gray", "orange", "green", "blue"]) {
    for (const elevation of [1, 2, 3, 4]) {
      assert.equal(getTileColor(color, elevation), TERRAIN_PALETTE[color][elevation]);
    }
    assert.equal(new Set([1, 2, 3, 4].map((elevation) => getTileColor(color, elevation))).size, 4);
  }
  assert.throws(() => getTileColor("invalid", 1), RangeError);
  assert.throws(() => getTileColor("gray", 5), RangeError);
});

test("changes a tile color without changing its elevation or other tiles", () => {
  const secondTerrain = createTerrain("second", getNeighborPositions(origin)[0], "definitive");
  const terrains = [firstTerrain, secondTerrain];
  const target = firstTerrain.tiles[0];
  const updated = setTileColor(terrains, firstTerrain.id, target.id, "orange");

  assert.equal(updated[0].tiles[0].terrainColor, "orange");
  assert.equal(updated[0].tiles[0].elevation, target.elevation);
  assert.equal(updated[0].tiles[1], firstTerrain.tiles[1]);
  assert.equal(updated[1], secondTerrain);
});

test("changes a tile elevation without changing its color or other tiles", () => {
  const target = firstTerrain.tiles[0];
  const updated = setTileElevation([firstTerrain], firstTerrain.id, target.id, 4);

  assert.equal(updated[0].tiles[0].elevation, 4);
  assert.equal(updated[0].tiles[0].terrainColor, target.terrainColor);
  assert.equal(updated[0].tiles[1], firstTerrain.tiles[1]);
  assert.throws(
    () => setTileElevation([firstTerrain], firstTerrain.id, target.id, 5),
    RangeError,
  );
});

test("resets just the target tile while preserving its identity and coordinates", () => {
  const target = { ...firstTerrain.tiles[0], terrainColor: "blue", elevation: 4, habitat: "future" };
  const terrain = { ...firstTerrain, tiles: [target, ...firstTerrain.tiles.slice(1)] };
  const updated = resetTile([terrain], terrain.id, target.id);
  const reset = updated[0].tiles[0];

  assert.equal(reset.id, target.id);
  assert.equal(reset.terrainId, target.terrainId);
  assert.deepEqual({ q: reset.q, r: reset.r }, { q: target.q, r: target.r });
  assert.equal(reset.terrainColor, "gray");
  assert.equal(reset.elevation, 1);
  assert.equal(reset.habitat, null);
  assert.equal(updated[0].tiles[1], terrain.tiles[1]);
});

test("resetting a tile already in its initial state is safe", () => {
  const updated = resetTile([firstTerrain], firstTerrain.id, firstTerrain.tiles[0].id);
  assert.equal(updated[0].tiles[0].terrainColor, "gray");
  assert.equal(updated[0].tiles[0].elevation, 1);
  assert.equal(updated[0].tiles[0].habitat, null);
});

test("edits ghost terrain tiles without changing ghost status", () => {
  const ghost = createTerrain("ghost", origin, "ghost");
  const tile = ghost.tiles[0];
  const edited = setTileElevation(setTileColor([ghost], ghost.id, tile.id, "blue"), ghost.id, tile.id, 3);

  assert.equal(edited[0].status, "ghost");
  assert.equal(edited[0].tiles[0].terrainColor, "blue");
  assert.equal(edited[0].tiles[0].elevation, 3);
});
