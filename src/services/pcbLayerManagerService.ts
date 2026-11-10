/**
 * LayerManager Service for PCB & Schematic Intelligence Scanner
 * AutoElectric Lab Pro - RAMT Engineering Suite
 */

import { LayerVisibilityConfig } from '../types/pcbScanner';

export interface ExtendedLayerState extends LayerVisibilityConfig {
  photoOpacity: number;
  photoHighContrast: boolean;
  componentsOpacity: number;
  tracesOpacity: number;
  annotationsOpacity: number;
}

const LAYER_STORAGE_KEY_PREFIX = 'autoelectric_pcb_layer_state_';

export class LayerManagerService {
  /**
   * Returns default initial layer configuration
   */
  static getDefaultState(): ExtendedLayerState {
    return {
      showPhotoBase: true,
      photoOpacity: 0.95,
      photoHighContrast: false,
      showComponents: true,
      componentsOpacity: 1.0,
      showTraces: true,
      tracesOpacity: 1.0,
      showAnnotations: true,
      annotationsOpacity: 1.0,
    };
  }

  /**
   * Toggle a specific layer's visibility state while preserving zoom/pan canvas state
   */
  static toggleLayerVisibility(
    currentState: ExtendedLayerState,
    layerKey: keyof LayerVisibilityConfig
  ): ExtendedLayerState {
    return {
      ...currentState,
      [layerKey]: !currentState[layerKey],
    };
  }

  /**
   * Calculate layer configuration preset without resetting viewport zoom or pan offsets
   */
  static getPresetState(
    currentState: ExtendedLayerState,
    preset: 'ALL' | 'COMPONENTS' | 'TRACES' | 'ANNOTATIONS' | 'PHOTO_ONLY' | 'HIGH_CONTRAST'
  ): ExtendedLayerState {
    switch (preset) {
      case 'ALL':
        return {
          ...currentState,
          showPhotoBase: true,
          photoOpacity: 0.95,
          showComponents: true,
          componentsOpacity: 1.0,
          showTraces: true,
          tracesOpacity: 1.0,
          showAnnotations: true,
          annotationsOpacity: 1.0,
        };
      case 'COMPONENTS':
        return {
          ...currentState,
          showPhotoBase: true,
          photoOpacity: 0.85,
          showComponents: true,
          componentsOpacity: 1.0,
          showTraces: false,
          showAnnotations: false,
        };
      case 'TRACES':
        return {
          ...currentState,
          showPhotoBase: true,
          photoOpacity: 0.75,
          photoHighContrast: true,
          showComponents: false,
          showTraces: true,
          tracesOpacity: 1.0,
          showAnnotations: false,
        };
      case 'ANNOTATIONS':
        return {
          ...currentState,
          showPhotoBase: true,
          photoOpacity: 0.8,
          showComponents: false,
          showTraces: false,
          showAnnotations: true,
          annotationsOpacity: 1.0,
        };
      case 'PHOTO_ONLY':
        return {
          ...currentState,
          showPhotoBase: true,
          photoOpacity: 1.0,
          photoHighContrast: false,
          showComponents: false,
          showTraces: false,
          showAnnotations: false,
        };
      case 'HIGH_CONTRAST':
        return {
          ...currentState,
          showPhotoBase: true,
          photoHighContrast: !currentState.photoHighContrast,
        };
      default:
        return currentState;
    }
  }

  /**
   * Persist layer configuration to storage for a given project ID
   */
  static saveLayerState(projectId: string, state: ExtendedLayerState): void {
    try {
      localStorage.setItem(`${LAYER_STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save layer state:', e);
    }
  }

  /**
   * Retrieve saved layer configuration for a project ID
   */
  static loadLayerState(projectId: string): ExtendedLayerState {
    try {
      const raw = localStorage.getItem(`${LAYER_STORAGE_KEY_PREFIX}${projectId}`);
      if (!raw) return this.getDefaultState();
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load layer state:', e);
      return this.getDefaultState();
    }
  }

  /**
   * Converts client screen coordinates into normalized 0-1000 canvas coordinates,
   * accounting for active zoom level and pan translation offsets.
   */
  static calculateNormalizedCanvasCoords(
    clientX: number,
    clientY: number,
    svgElement: SVGSVGElement
  ): { x: number; y: number } {
    const rect = svgElement.getBoundingClientRect();
    const x = Math.round(((clientX - rect.left) / rect.width) * 1000);
    const y = Math.round(((clientY - rect.top) / rect.height) * 1000);
    return {
      x: Math.max(0, Math.min(1000, x)),
      y: Math.max(0, Math.min(1000, y)),
    };
  }
}
