"use client";

import {
  ArrowLeft,
  Droplets,
  Mountain,
  Palette,
  RotateCcw,
  Sprout,
  Waves,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { Elevation, TerrainColor, TerrainTile } from "@/lib/hex-grid";
import { TERRAIN_COLOR_LABELS, TERRAIN_PALETTE } from "@/lib/terrain-palette";

export type TilePopoverMode = "actions" | "color" | "elevation";

interface TilePopoverProps {
  tile: TerrainTile;
  mode: TilePopoverMode;
  position: { left: number; top: number };
  onModeChange: (mode: TilePopoverMode) => void;
  onColorSelect: (color: TerrainColor) => void;
  onElevationSelect: (elevation: Elevation) => void;
  onReset: () => void;
  popoverRef: (node: HTMLDivElement | null) => void;
}

const actions = [
  { label: "Ajouter un habitat", icon: Sprout, disabled: true },
  { label: "Ajouter une rivière", icon: Waves, disabled: true },
  { label: "Ajouter un lac", icon: Droplets, disabled: true },
] as const;

export default function TilePopover({
  tile,
  mode,
  position,
  onModeChange,
  onColorSelect,
  onElevationSelect,
  onReset,
  popoverRef,
}: TilePopoverProps) {
  const style = {
    left: `${position.left}px`,
    top: `${position.top}px`,
  } satisfies CSSProperties;

  return (
    <div
      ref={popoverRef}
      className="tile-popover"
      style={style}
      role="dialog"
      aria-label={mode === "actions" ? "Actions de la tuile" : mode === "color" ? "Choisir une couleur" : "Choisir une élévation"}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {mode === "actions" ? (
        <div className="tile-action-grid">
          {actions.map(({ label, icon: Icon, disabled }) => (
            <button
              key={label}
              className="tile-action-button is-disabled"
              type="button"
              title={label}
              aria-label={label}
              disabled={disabled}
            >
              <Icon aria-hidden="true" />
            </button>
          ))}
          <button
            className="tile-action-button"
            type="button"
            title="Éditer l’élévation"
            aria-label="Éditer l’élévation"
            onClick={() => onModeChange("elevation")}
          >
            <Mountain aria-hidden="true" />
          </button>
          <button
            className="tile-action-button"
            type="button"
            title="Réinitialiser la tuile"
            aria-label="Réinitialiser la tuile"
            onClick={onReset}
          >
            <RotateCcw aria-hidden="true" />
          </button>
          <button
            className="tile-action-button"
            type="button"
            title="Modifier la couleur du terrain"
            aria-label="Modifier la couleur du terrain"
            onClick={() => onModeChange("color")}
          >
            <Palette aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className="tile-submenu-header">
            <button
              className="tile-back-button"
              type="button"
              onClick={() => onModeChange("actions")}
              aria-label="Retour aux actions"
              title="Retour"
            >
              <ArrowLeft aria-hidden="true" />
            </button>
            <span>{mode === "color" ? "Couleur du terrain" : "Élévation"}</span>
          </div>
          {mode === "color" ? (
            <div className="tile-choice-row">
              {(Object.keys(TERRAIN_COLOR_LABELS) as TerrainColor[]).map((color) => (
                <button
                  key={color}
                  className={`tile-color-choice${tile.terrainColor === color ? " is-selected" : ""}`}
                  type="button"
                  style={{ "--swatch": TERRAIN_PALETTE[color][2] } as CSSProperties}
                  title={TERRAIN_COLOR_LABELS[color]}
                  aria-label={TERRAIN_COLOR_LABELS[color]}
                  aria-pressed={tile.terrainColor === color}
                  onClick={() => onColorSelect(color)}
                />
              ))}
            </div>
          ) : (
            <div className="tile-choice-row">
              {([1, 2, 3, 4] as const).map((elevation) => (
                <button
                  key={elevation}
                  className={`tile-elevation-choice${tile.elevation === elevation ? " is-selected" : ""}`}
                  type="button"
                  title={`Niveau ${elevation}`}
                  aria-label={`Niveau ${elevation}`}
                  aria-pressed={tile.elevation === elevation}
                  onClick={() => onElevationSelect(elevation)}
                >
                  {elevation}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
