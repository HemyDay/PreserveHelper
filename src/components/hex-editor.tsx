"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react";
import Link from "next/link";
import {
  createTerrain,
  generateTerrainCoordinates,
  getNeighborPositions,
  isValidTerrainPlacement,
  type AxialCoordinate,
  type Terrain,
  type TerrainStatus,
} from "@/lib/hex-grid";

const TILE_SIZE = 27;
const MAX_ZOOM = 2;
const MIN_ZOOM = 0.45;
const PLACEMENT_SNAP_RADIUS = TILE_SIZE * 3.2;

interface Viewport {
  width: number;
  height: number;
}

interface ViewTransform {
  x: number;
  y: number;
  zoom: number;
}

interface PixelCoordinate {
  x: number;
  y: number;
}

interface Placement {
  status: TerrainStatus;
  position: AxialCoordinate | null;
}

const initialTerrain = createTerrain("terrain-initial", { q: 0, r: 0 }, "definitive");

function axialToPixel({ q, r }: AxialCoordinate): PixelCoordinate {
  return {
    x: TILE_SIZE * Math.sqrt(3) * (q + r / 2),
    y: TILE_SIZE * 1.5 * r,
  };
}

function pixelToAxial(x: number, y: number): AxialCoordinate {
  const fractionalQ = ((Math.sqrt(3) / 3) * x - y / 3) / TILE_SIZE;
  const fractionalR = ((2 / 3) * y) / TILE_SIZE;
  const cubeX = fractionalQ;
  const cubeZ = fractionalR;
  const cubeY = -cubeX - cubeZ;
  let roundedX = Math.round(cubeX);
  let roundedY = Math.round(cubeY);
  let roundedZ = Math.round(cubeZ);
  const xDifference = Math.abs(roundedX - cubeX);
  const yDifference = Math.abs(roundedY - cubeY);
  const zDifference = Math.abs(roundedZ - cubeZ);

  if (xDifference > yDifference && xDifference > zDifference) {
    roundedX = -roundedY - roundedZ;
  } else if (yDifference > zDifference) {
    roundedY = -roundedX - roundedZ;
  } else {
    roundedZ = -roundedX - roundedY;
  }

  return { q: roundedX, r: roundedZ };
}

function hexPoints(x: number, y: number): string {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    return `${x + TILE_SIZE * Math.cos(angle)},${y + TILE_SIZE * Math.sin(angle)}`;
  }).join(" ");
}

function findPlacementTarget(
  x: number,
  y: number,
  terrains: readonly Terrain[],
): AxialCoordinate | null {
  const mouseTile = pixelToAxial(x, y);
  const mousePixel = axialToPixel(mouseTile);
  const candidates = new Map<string, AxialCoordinate>();

  for (const terrain of terrains) {
    for (const candidate of getNeighborPositions(terrain.position)) {
      const key = `${candidate.q},${candidate.r}`;
      if (isValidTerrainPlacement(candidate, terrains)) {
        candidates.set(key, candidate);
      }
    }
  }

  let closest: AxialCoordinate | null = null;
  let closestDistance = PLACEMENT_SNAP_RADIUS;
  for (const candidate of candidates.values()) {
    const pixel = axialToPixel(candidate);
    const distance = Math.hypot(pixel.x - mousePixel.x, pixel.y - mousePixel.y);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }

  return closest;
}

function MapIcon({ kind }: { kind: "center" | "close" }) {
  return kind === "center" ? (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5" />
      <path d="M7 7h6v6H7z" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

export default function HexEditor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [terrains, setTerrains] = useState<Terrain[]>([initialTerrain]);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewport, setViewport] = useState<Viewport>({ width: 1280, height: 720 });
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, zoom: 1 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewport({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!placement && !isAddDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPlacement(null);
        setIsAddDialogOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddDialogOpen, placement]);

  const closePlacementDialog = useCallback(() => {
    setIsAddDialogOpen(false);
    setPlacement(null);
  }, []);

  function startPlacement(status: TerrainStatus) {
    setIsAddDialogOpen(false);
    setPlacement({ status, position: null });
  }

  function getMapPoint(event: ReactPointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left - viewport.width / 2 - view.x) / view.zoom,
      y: (event.clientY - bounds.top - viewport.height / 2 - view.y) / view.zoom,
    };
  }

  function updatePlacement(event: ReactPointerEvent<SVGSVGElement>) {
    if (!placement) return;
    const point = getMapPoint(event);
    setPlacement((current) =>
      current
        ? {
            ...current,
            position: findPlacementTarget(point.x, point.y, terrains),
          }
        : null,
    );
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (placement) {
      updatePlacement(event);
      return;
    }
    if (event.button !== 0) return;
    dragOrigin.current = {
      x: event.clientX,
      y: event.clientY,
      panX: view.x,
      panY: view.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragOrigin.current) {
      const drag = dragOrigin.current;
      setView((current) => ({
        ...current,
        x: drag.panX + event.clientX - drag.x,
        y: drag.panY + event.clientY - drag.y,
      }));
      return;
    }
    updatePlacement(event);
  }

  function handlePointerUp() {
    dragOrigin.current = null;
  }

  function handleMapClick(event: ReactPointerEvent<SVGSVGElement>) {
    if (!placement) return;
    const point = getMapPoint(event);
    const target = findPlacementTarget(point.x, point.y, terrains);
    if (!target || !isValidTerrainPlacement(target, terrains)) return;
    const id = `terrain-${crypto.randomUUID()}`;
    setTerrains((current) => [...current, createTerrain(id, target, placement.status)]);
    setPlacement(null);
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left - viewport.width / 2;
    const pointerY = event.clientY - bounds.top - viewport.height / 2;
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, view.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)),
    );
    const ratio = nextZoom / view.zoom;
    setView({
      x: pointerX - (pointerX - view.x) * ratio,
      y: pointerY - (pointerY - view.y) * ratio,
      zoom: nextZoom,
    });
  }

  function fitMap() {
    const points = terrains.flatMap((terrain) =>
      generateTerrainCoordinates(terrain.position).map(axialToPixel),
    );
    const padding = TILE_SIZE * 4;
    const minX = Math.min(...points.map(({ x }) => x)) - padding;
    const maxX = Math.max(...points.map(({ x }) => x)) + padding;
    const minY = Math.min(...points.map(({ y }) => y)) - padding;
    const maxY = Math.max(...points.map(({ y }) => y)) + padding;
    const zoom = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(viewport.width / (maxX - minX), viewport.height / (maxY - minY)),
      ),
    );
    setView({
      x: -((minX + maxX) / 2) * zoom,
      y: -((minY + maxY) / 2) * zoom,
      zoom,
    });
  }

  const preview = placement?.position
    ? createTerrain("terrain-preview", placement.position, placement.status)
    : null;

  return (
    <main className="editor">
      <header className="toolbar">
        <Link className="brand" href="/" aria-label="Preserve, accueil">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="m16 2 12 7v14l-12 7L4 23V9l12-7Z" />
              <path d="m16 2 0 14m0 0 12-7m-12 7-12-7m12 7v14" />
            </svg>
          </span>
          <span className="brand-name">preserve<span>.</span></span>
        </Link>

        <div className="toolbar-divider" />

        <button className="tool-button tool-button-primary" onClick={() => setIsAddDialogOpen(true)}>
          <span className="button-plus" aria-hidden="true">+</span>
          Ajouter du terrain
        </button>
        <button className="tool-button tool-button-disabled" disabled>
          <span className="button-plus" aria-hidden="true">+</span>
          Ajouter une merveille
          <span className="coming-soon">Bientôt</span>
        </button>

        <div className="toolbar-spacer" />
        {placement && (
          <div className="placement-hint">
            <span className="hint-dot" />
            Choisissez un côté disponible
            <button className="hint-cancel" onClick={closePlacementDialog}>Annuler</button>
          </div>
        )}
        <div className="toolbar-divider toolbar-divider-right" />
        <button className="icon-button" onClick={fitMap} aria-label="Recentrer la carte" title="Recentrer la carte">
          <MapIcon kind="center" />
        </button>
      </header>

      <section className={`map-workspace${placement ? " is-placing" : ""}`} aria-label="Éditeur de carte">
        <svg
          ref={svgRef}
          className="map-canvas"
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => {
            if (!placement) return;
            setPlacement((current) => current && { ...current, position: null });
          }}
          onClick={handleMapClick}
          onWheel={handleWheel}
          role="img"
          aria-label={`${terrains.length} terrain${terrains.length > 1 ? "s" : ""} sur la carte`}
        >
          <defs>
            <pattern id="map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#d8ddd5" />
            </pattern>
          </defs>
          <rect width={viewport.width} height={viewport.height} fill="url(#map-grid)" />
          <g transform={`translate(${viewport.width / 2 + view.x} ${viewport.height / 2 + view.y}) scale(${view.zoom})`}>
            {terrains.map((terrain) => (
              <g
                key={terrain.id}
                className={`terrain terrain-${terrain.status}`}
                opacity={terrain.status === "ghost" ? 0.45 : 1}
              >
                {terrain.tiles.map((tile) => {
                  const pixel = axialToPixel(tile);
                  return (
                    <polygon
                      key={tile.id}
                      points={hexPoints(pixel.x, pixel.y)}
                      className="terrain-tile"
                    />
                  );
                })}
              </g>
            ))}
            {preview && (
              <g
                className={`terrain-preview terrain-${preview.status}`}
                opacity={preview.status === "ghost" ? 0.45 : 0.68}
              >
                {preview.tiles.map((tile) => {
                  const pixel = axialToPixel(tile);
                  return (
                    <polygon
                      key={tile.id}
                      points={hexPoints(pixel.x, pixel.y)}
                      className="terrain-tile"
                    />
                  );
                })}
              </g>
            )}
          </g>
        </svg>
        <div className="map-caption">
          <span className="caption-count">{terrains.length.toString().padStart(2, "0")}</span>
          <span>terrain{terrains.length > 1 ? "s" : ""}</span>
          <span className="caption-separator" />
          <span>{terrains.reduce((count, terrain) => count + terrain.tiles.length, 0)} tuiles</span>
        </div>
        <div className="map-controls" aria-label="Navigation de la carte">
          <button onClick={() => setView((current) => ({ ...current, zoom: Math.min(MAX_ZOOM, current.zoom * 1.2) }))} aria-label="Zoomer">+</button>
          <span>{Math.round(view.zoom * 100)}%</span>
          <button onClick={() => setView((current) => ({ ...current, zoom: Math.max(MIN_ZOOM, current.zoom / 1.2) }))} aria-label="Dézoomer">−</button>
        </div>
        <p className="map-tip">Glisser pour déplacer <span>·</span> Molette pour zoomer</p>
      </section>

      {isAddDialogOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePlacementDialog();
          }}
        >
          <section
            className="terrain-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terrain-dialog-title"
          >
            <button className="dialog-close icon-button" onClick={closePlacementDialog} aria-label="Fermer">
              <MapIcon kind="close" />
            </button>
            <span className="dialog-eyebrow">VOTRE PAYSAGE</span>
            <h1 id="terrain-dialog-title">Ajouter un terrain</h1>
            <p className="dialog-description">
              Choisissez votre terrain, puis placez-le à côté d’un terrain existant.
            </p>
            <div className="terrain-options">
              <button className="terrain-option" onClick={() => startPlacement("definitive")}>
                <span className="option-icon option-icon-solid" aria-hidden="true">
                  <svg viewBox="0 0 36 36"><path d="m18 2 15 8.5v15L18 34 3 25.5v-15L18 2Z" /><path d="m18 2 0 16m0 0 15-7.5M18 18 3 10.5m15 7.5v16" /></svg>
                </span>
                <span className="option-copy">
                  <strong>Créer un terrain</strong>
                  <span>Ajouter un terrain définitif</span>
                </span>
                <span className="option-arrow" aria-hidden="true">→</span>
              </button>
              <button className="terrain-option" onClick={() => startPlacement("ghost")}>
                <span className="option-icon option-icon-ghost" aria-hidden="true">
                  <svg viewBox="0 0 36 36"><path d="m18 2 15 8.5v15L18 34 3 25.5v-15L18 2Z" /><path d="m18 2 0 16m0 0 15-7.5M18 18 3 10.5m15 7.5v16" /></svg>
                </span>
                <span className="option-copy">
                  <strong>Créer un terrain fantôme</strong>
                  <span>Un repère temporaire semi-transparent</span>
                </span>
                <span className="option-arrow" aria-hidden="true">→</span>
              </button>
            </div>
            <button className="dialog-cancel" onClick={closePlacementDialog}>Annuler</button>
          </section>
        </div>
      )}
    </main>
  );
}
