import type { Map as MaplibreMap } from "maplibre-gl";
import { installPatternFills, type StyleLike } from "./installPatternFills";

export interface ObservePatternFillsOptions {
  /** Defaults to `map.getStyle()`. Useful when metadata is stored separately. */
  getStyle?: () => StyleLike;
  /** Receives asynchronous restoration failures triggered by style reloads. */
  onError?: (error: unknown) => void;
}

export interface PatternFillObserver {
  /** Installs or restores every registered image in the current style. */
  refresh(): Promise<void>;
  /** Removes the `style.load` listener. Safe to call repeatedly. */
  dispose(): void;
}

/**
 * Restores generated pattern images after every MapLibre style load.
 *
 * The returned observer owns one listener and must be disposed with the map or
 * component that created it. Installation is idempotent, so `refresh` is also
 * safe to call explicitly after changing metadata.
 */
export function observePatternFills(
  map: MaplibreMap,
  options: ObservePatternFillsOptions = {},
): PatternFillObserver {
  const getStyle = options.getStyle ?? (() => map.getStyle() as StyleLike);
  const onError = options.onError ?? ((error: unknown) => {
    console.error("maplibre-pattern-fills: failed to restore pattern images", error);
  });
  let disposed = false;

  const refresh = async (): Promise<void> => {
    if (disposed) return;
    await installPatternFills(map, getStyle());
  };
  const onStyleLoad = (): void => {
    void refresh().catch(onError);
  };

  map.on("style.load", onStyleLoad);

  return {
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      map.off("style.load", onStyleLoad);
    },
  };
}
