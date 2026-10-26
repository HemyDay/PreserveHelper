import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTerrain,
  generateTerrainCoordinates,
  getNeighborPositions,
  hasTerrainOverlap,
  isValidTerrainPlacement,
} from "./hex-grid.ts";

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
