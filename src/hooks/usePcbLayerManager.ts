import { useState, useCallback } from 'react';
import { LayerVisibilityConfig } from '../types/pcbScanner';

export interface ExtendedLayerState extends LayerVisibilityConfig {
  photoOpacity: number; // 0.1 to 1.0
  photoHighContrast: boolean;
  componentsOpacity: number;
  tracesOpacity: number;
  annotationsOpacity: number;
}

export interface PanOffset {
  x: number;
  y: number;
}

export function usePcbLayerManager(initialConfig?: Partial<ExtendedLayerState>) {
  const [layers, setLayers] = useState<ExtendedLayerState>({
    showPhotoBase: initialConfig?.showPhotoBase ?? true,
    photoOpacity: initialConfig?.photoOpacity ?? 0.95,
    photoHighContrast: initialConfig?.photoHighContrast ?? false,
    showComponents: initialConfig?.showComponents ?? true,
    componentsOpacity: initialConfig?.componentsOpacity ?? 1.0,
    showTraces: initialConfig?.showTraces ?? true,
    tracesOpacity: initialConfig?.tracesOpacity ?? 1.0,
    showAnnotations: initialConfig?.showAnnotations ?? true,
    annotationsOpacity: initialConfig?.annotationsOpacity ?? 1.0,
  });

  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Toggle individual layer boolean
  const toggleLayer = useCallback((layerKey: keyof LayerVisibilityConfig) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }, []);

  // Update specific numeric or boolean property
  const setLayerProperty = useCallback(<K extends keyof ExtendedLayerState>(key: K, value: ExtendedLayerState[K]) => {
    setLayers((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Apply predefined layer view presets
  const applyPreset = useCallback((preset: 'ALL' | 'COMPONENTS' | 'TRACES' | 'ANNOTATIONS' | 'PHOTO_ONLY' | 'HIGH_CONTRAST') => {
    switch (preset) {
      case 'ALL':
        setLayers({
          showPhotoBase: true,
          photoOpacity: 0.95,
          photoHighContrast: false,
          showComponents: true,
          componentsOpacity: 1.0,
          showTraces: true,
          tracesOpacity: 1.0,
          showAnnotations: true,
          annotationsOpacity: 1.0,
        });
        break;
      case 'COMPONENTS':
        setLayers({
          showPhotoBase: true,
          photoOpacity: 0.85,
          photoHighContrast: false,
          showComponents: true,
          componentsOpacity: 1.0,
          showTraces: false,
          tracesOpacity: 0.2,
          showAnnotations: false,
          annotationsOpacity: 0.2,
        });
        break;
      case 'TRACES':
        setLayers({
          showPhotoBase: true,
          photoOpacity: 0.75,
          photoHighContrast: true,
          showComponents: false,
          componentsOpacity: 0.2,
          showTraces: true,
          tracesOpacity: 1.0,
          showAnnotations: false,
          annotationsOpacity: 0.2,
        });
        break;
      case 'ANNOTATIONS':
        setLayers({
          showPhotoBase: true,
          photoOpacity: 0.8,
          photoHighContrast: false,
          showComponents: false,
          componentsOpacity: 0.2,
          showTraces: false,
          tracesOpacity: 0.2,
          showAnnotations: true,
          annotationsOpacity: 1.0,
        });
        break;
      case 'PHOTO_ONLY':
        setLayers({
          showPhotoBase: true,
          photoOpacity: 1.0,
          photoHighContrast: false,
          showComponents: false,
          componentsOpacity: 0.0,
          showTraces: false,
          tracesOpacity: 0.0,
          showAnnotations: false,
          annotationsOpacity: 0.0,
        });
        break;
      case 'HIGH_CONTRAST':
        setLayers((prev) => ({
          ...prev,
          showPhotoBase: true,
          photoHighContrast: !prev.photoHighContrast,
        }));
        break;
    }
  }, []);

  // Zoom manipulation
  const handleZoom = useCallback((delta: number) => {
    setZoomLevel((prev) => Math.min(5.0, Math.max(0.5, Number((prev + delta).toFixed(2)))));
  }, []);

  const resetZoomAndPan = useCallback(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Pan manipulation
  const updatePan = useCallback((dx: number, dy: number) => {
    setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
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
