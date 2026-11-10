import { useState, useCallback, useEffect } from 'react';
import { LayerVisibilityConfig } from '../types/pcbScanner';
import { LayerManagerService, ExtendedLayerState } from '../services/pcbLayerManagerService';

export type { ExtendedLayerState };

export interface PanOffset {
  x: number;
  y: number;
}

export function usePcbLayerManager(activeProjectId?: string) {
  // Load saved project layer state or default initial state
  const [layers, setLayers] = useState<ExtendedLayerState>(() => {
    if (activeProjectId) {
      return LayerManagerService.loadLayerState(activeProjectId);
    }
    return LayerManagerService.getDefaultState();
  });

  // Preserve viewport transform (zoom & pan offset) across layer visibility toggles
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Sync state when project changes, while preserving current zoom/pan state
  useEffect(() => {
    if (activeProjectId) {
      const savedState = LayerManagerService.loadLayerState(activeProjectId);
      setLayers(savedState);
    }
  }, [activeProjectId]);

  // Persist layer state changes automatically
  const updateStateAndPersist = useCallback(
    (updater: (prev: ExtendedLayerState) => ExtendedLayerState) => {
      setLayers((prev) => {
        const nextState = updater(prev);
        if (activeProjectId) {
          LayerManagerService.saveLayerState(activeProjectId, nextState);
        }
        return nextState;
      });
    },
    [activeProjectId]
  );

  // Toggle individual layer visibility while keeping canvas state (zoom/pan) untouched
  const toggleLayer = useCallback(
    (layerKey: keyof LayerVisibilityConfig) => {
      updateStateAndPersist((prev) => LayerManagerService.toggleLayerVisibility(prev, layerKey));
    },
    [updateStateAndPersist]
  );

  // Apply predefined layer view presets while preserving zoom/pan
  const applyPreset = useCallback(
    (preset: 'ALL' | 'COMPONENTS' | 'TRACES' | 'ANNOTATIONS' | 'PHOTO_ONLY' | 'HIGH_CONTRAST') => {
      updateStateAndPersist((prev) => LayerManagerService.getPresetState(prev, preset));
    },
    [updateStateAndPersist]
  );

  // Set numeric property (e.g., opacity)
  const setLayerProperty = useCallback(
    <K extends keyof ExtendedLayerState>(key: K, value: ExtendedLayerState[K]) => {
      updateStateAndPersist((prev) => ({ ...prev, [key]: value }));
    },
    [updateStateAndPersist]
  );

  // Viewport Zoom controls
  const handleZoom = useCallback((delta: number) => {
    setZoomLevel((prev) => Math.min(5.0, Math.max(0.5, Number((prev + delta).toFixed(2)))));
  }, []);

  // Viewport Pan controls
  const updatePan = useCallback((dx: number, dy: number) => {
    setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  // Reset Zoom & Pan to default center view
  const resetZoomAndPan = useCallback(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  return {
    layers,
    zoomLevel,
    panOffset,
    isPanning,
    setIsPanning,
    toggleLayer,
    setLayerProperty,
    applyPreset,
    handleZoom,
    setZoomLevel,
    resetZoomAndPan,
    updatePan,
    setPanOffset,
  };
}
