import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DetectedComponent, ElectricalNet, TechnicianAnnotation, DocumentType } from '../types/pcbScanner';
import { ExtendedLayerState, PanOffset } from '../hooks/usePcbLayerManager';
import { AlertCircle, Flame, Scissors, Target, MessageSquare, Trash2, Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PcbCanvasOverlayProps {
  imageUrl: string;
  documentType?: DocumentType;
  components: DetectedComponent[];
  nets: ElectricalNet[];
  annotations?: TechnicianAnnotation[];
  layerConfig: ExtendedLayerState;
  selectedComponentId: string | null;
  selectedNetId: string | null;
  selectedAnnotationId?: string | null;
  onSelectComponent: (componentId: string) => void;
  onSelectAnnotation?: (annotationId: string) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  onCanvasClick?: (coords: { x: number; y: number }) => void;
  isAddingAnnotation?: boolean;
  probeRedComponentId?: string | null;
  probeBlackComponentId?: string | null;
  onProbeSnap?: (componentId: string, terminal?: string) => void;
  zoomLevel: number;
  panOffset: PanOffset;
  onZoomChange: (delta: number) => void;
  onPanChange: (dx: number, dy: number) => void;
  onResetZoomPan: () => void;
}

export const PcbCanvasOverlay: React.FC<PcbCanvasOverlayProps> = ({
  imageUrl,
  documentType = 'PHYSICAL_PCB_PHOTO',
  components,
  nets,
  annotations = [],
  layerConfig,
  selectedComponentId,
  selectedNetId,
  selectedAnnotationId,
  onSelectComponent,
  onSelectAnnotation,
  onDeleteAnnotation,
  onCanvasClick,
  isAddingAnnotation = false,
  probeRedComponentId,
  probeBlackComponentId,
  onProbeSnap,
  zoomLevel,
  panOffset,
  onZoomChange,
  onPanChange,
  onResetZoomPan,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [hoveredCompId, setHoveredCompId] = useState<string | null>(null);
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null);

  // Drag-to-pan state
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle Mouse Down for Panning & Clicking
  const handleMouseDown = (e: React.MouseEvent) => {
    // Left click drag for pan
    if (e.button === 0) {
      setIsMouseDown(true);
      setIsDragging(false);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle Mouse Move for Panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      setIsDragging(true);
      onPanChange(dx, dy);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle Mouse Up
  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  // Wheel zoom handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      onZoomChange(delta);
    },
    [onZoomChange]
  );

  // Handle Canvas Click (only triggers if NOT dragging)
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) return; // Prevent pin drop when panning
    if (!svgRef.current || !onCanvasClick) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000);
    onCanvasClick({ x: Math.max(0, Math.min(1000, x)), y: Math.max(0, Math.min(1000, y)) });
  };

  // Helper function for annotation pin badges
  const getAnnotationBadge = (category: TechnicianAnnotation['category']) => {
    switch (category) {
      case 'BURNT_COMPONENT':
        return { fill: '#ef4444', stroke: '#fca5a5', text: 'BURNT', Icon: Flame };
      case 'CORROSION':
        return { fill: '#f59e0b', stroke: '#fde68a', text: 'CORROSION', Icon: AlertCircle };
      case 'BROKEN_TRACE':
        return { fill: '#f97316', stroke: '#ffedd5', text: 'BROKEN', Icon: Scissors };
      case 'TEST_POINT_PIN':
        return { fill: '#06b6d4', stroke: '#cff4fc', text: 'TEST PIN', Icon: Target };
      case 'NOTE':
      default:
        return { fill: '#a855f7', stroke: '#f3e8ff', text: 'NOTE', Icon: MessageSquare };
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={`relative flex-1 overflow-hidden bg-slate-950 flex items-center justify-center p-4 select-none tech-grid min-h-[550px] ${
        isAddingAnnotation
          ? 'cursor-crosshair'
          : isMouseDown
          ? 'cursor-grabbing'
          : 'cursor-grab'
      }`}
    >
      {/* Floating Canvas Quick Viewport Navigation Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl font-mono text-xs">
        <span className="text-[10px] text-slate-400 px-2 font-bold uppercase tracking-wider">
          Viewport: {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => onZoomChange(-0.2)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => onZoomChange(0.2)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={onResetZoomPan}
          className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800"
          title="Reset Viewport & Center Pan"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Scalable & Transformed Canvas Container */}
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isMouseDown ? 'none' : 'transform 0.12s ease-out',
        }}
        className="relative shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-slate-950"
      >
        {/* Layer 1: High-Resolution Source Image / Physical PCB Photo Base */}
        {layerConfig.showPhotoBase ? (
          <img
            src={imageUrl}
            alt="ECU Schematic or Physical PCB"
            style={{
              opacity: layerConfig.photoOpacity,
              filter: layerConfig.photoHighContrast
                ? 'contrast(145%) brightness(115%) saturate(130%)'
                : 'none',
              imageRendering:
                documentType === 'PHYSICAL_PCB_PHOTO' && zoomLevel > 1.4 ? 'pixelated' : 'auto',
            }}
            className="max-w-[1400px] w-full h-auto block transition-all duration-150"
          />
        ) : (
          <div className="w-[1200px] h-[800px] bg-slate-950 border border-slate-800/80 flex items-center justify-center">
            <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">
              BASE HARDWARE IMAGE LAYER HIDDEN · OVERLAYS ACTIVE
            </span>
          </div>
        )}

        {/* SVG Interactive Vector Overlay */}
        <svg
          ref={svgRef}
          onClick={handleSvgClick}
          className={`absolute inset-0 w-full h-full ${
            isAddingAnnotation ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          {/* Layer 2: Illuminated Copper Traces & Nets */}
          {layerConfig.showTraces &&
            nets.map((net) => {
              const isSelected = net.id === selectedNetId;
              if (!net.tracePoints || net.tracePoints.length < 2) return null;

              let pathD = `M ${net.tracePoints[0].x} ${net.tracePoints[0].y}`;
              for (let i = 1; i < net.tracePoints.length; i++) {
                pathD += ` L ${net.tracePoints[i].x} ${net.tracePoints[i].y}`;
              }

              return (
                <g
                  key={net.id}
                  className="pointer-events-auto cursor-pointer"
                  style={{ opacity: layerConfig.tracesOpacity }}
                >
                  {/* Outer Illuminated Glow */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSelected ? '#06b6d4' : 'rgba(56, 189, 248, 0.4)'}
                    strokeWidth={isSelected ? 10 : 5}
                    strokeOpacity={0.3}
                  />
                  {/* Core Trace Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSelected ? '#22d3ee' : '#38bdf8'}
                    strokeWidth={isSelected ? 5 : 2.5}
                    strokeDasharray={net.isComplete ? undefined : '6,6'}
                    className="transition-all"
                  />
                </g>
              );
            })}

          {/* Layer 3: Identified Component Bounding Boxes */}
          {layerConfig.showComponents &&
            components.map((comp) => {
              const isSelected = comp.id === selectedComponentId;
              const isHovered = comp.id === hoveredCompId;
              const isRedProbe = comp.id === probeRedComponentId;
              const isBlackProbe = comp.id === probeBlackComponentId;

              const { ymin, xmin, ymax, xmax } = comp.bbox;
              const width = xmax - xmin;
              const height = ymax - ymin;

              let strokeColor = '#38bdf8'; // sky blue default
              let fillColor = 'rgba(56, 189, 248, 0.12)';

              if (comp.verificationStatus === 'VERIFIED') {
                strokeColor = '#10b981'; // emerald
              } else if (comp.verificationStatus === 'UNVERIFIED') {
                strokeColor = '#f59e0b'; // amber
              } else if (comp.verificationStatus === 'CROSS_REFERENCED') {
                strokeColor = '#06b6d4'; // cyan
              }

              if (isSelected) {
                strokeColor = '#06b6d4'; // cyan
                fillColor = 'rgba(6, 182, 212, 0.3)';
              }
              if (isRedProbe) {
                strokeColor = '#ef4444'; // red probe
                fillColor = 'rgba(239, 68, 68, 0.35)';
              }
              if (isBlackProbe) {
                strokeColor = '#3b82f6'; // blue probe
                fillColor = 'rgba(59, 130, 246, 0.35)';
              }

              return (
                <g
                  key={comp.id}
                  className="pointer-events-auto cursor-pointer"
                  style={{ opacity: layerConfig.componentsOpacity }}
                  onClick={(e) => {
                    if (isDragging) return;
                    e.stopPropagation();
                    onSelectComponent(comp.id);
                    if (onProbeSnap) onProbeSnap(comp.id);
                  }}
                  onMouseEnter={() => setHoveredCompId(comp.id)}
                  onMouseLeave={() => setHoveredCompId(null)}
                >
                  {/* Bounding Box Rect */}
                  <rect
                    x={xmin}
                    y={ymin}
                    width={width}
                    height={height}
                    rx={6}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected || isHovered ? 4 : 2}
                    className="transition-all"
                  />

                  {/* Reference Designator Badge */}
                  <rect
                    x={xmin}
                    y={Math.max(10, ymin - 22)}
                    width={Math.max(50, comp.refDes.length * 9 + 14)}
                    height={20}
                    rx={4}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1}
                  />
                  <text
                    x={xmin + 6}
                    y={Math.max(24, ymin - 8)}
                    className="font-mono text-[11px] font-bold fill-white"
                  >
                    {comp.refDes}
                  </text>

                  {/* Multimeter Probe Snap Indicators */}
                  {isRedProbe && (
                    <circle cx={xmin + width / 2} cy={ymin + height / 2} r={12} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
                  )}
                  {isBlackProbe && (
                    <circle cx={xmin + width / 2} cy={ymin + height / 2} r={12} fill="#3b82f6" stroke="#ffffff" strokeWidth={2} />
                  )}
                </g>
              );
            })}

          {/* Layer 4: Manual Technician Annotations Pins */}
          {layerConfig.showAnnotations &&
            annotations.map((ann) => {
              const badge = getAnnotationBadge(ann.category);
              const isSelected = ann.id === selectedAnnotationId;
              const isHovered = ann.id === hoveredAnnId;

              return (
                <g
                  key={ann.id}
                  className="pointer-events-auto cursor-pointer"
                  style={{ opacity: layerConfig.annotationsOpacity }}
                  onClick={(e) => {
                    if (isDragging) return;
                    e.stopPropagation();
                    if (onSelectAnnotation) onSelectAnnotation(ann.id);
                  }}
                  onMouseEnter={() => setHoveredAnnId(ann.id)}
                  onMouseLeave={() => setHoveredAnnId(null)}
                >
                  {/* Pin Dot Halo */}
                  <circle
                    cx={ann.x}
                    cy={ann.y}
                    r={isSelected || isHovered ? 16 : 10}
                    fill={badge.fill}
                    fillOpacity={0.3}
                    className="animate-pulse"
                  />
                  {/* Solid Pin Marker */}
                  <circle
                    cx={ann.x}
                    cy={ann.y}
                    r={7}
                    fill={badge.fill}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />

                  {/* Pin Callout Badge */}
                  <g transform={`translate(${ann.x + 12}, ${ann.y - 12})`}>
                    <rect
                      x={0}
                      y={0}
                      width={badge.text.length * 7 + 16}
                      height={18}
                      rx={4}
                      fill="#020617"
                      stroke={badge.fill}
                      strokeWidth={1.5}
                    />
                    <text x={8} y={13} className="font-mono text-[9px] font-bold fill-white tracking-wider">
                      {badge.text}
                    </text>
                  </g>

                  {/* Detailed Callout Card */}
                  {(isSelected || isHovered) && (
                    <foreignObject
                      x={Math.min(750, ann.x + 10)}
                      y={Math.min(850, ann.y + 15)}
                      width={240}
                      height={110}
                      className="overflow-visible pointer-events-auto"
                    >
                      <div className="bg-slate-900/95 backdrop-blur-md text-slate-100 p-2.5 rounded-xl border border-slate-700 shadow-2xl text-xs font-mono space-y-1.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                          <span className="font-bold text-cyan-400 flex items-center gap-1 text-[11px]">
                            <badge.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: badge.fill }} />
                            {ann.category.replace('_', ' ')}
                          </span>
                          {onDeleteAnnotation && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAnnotation(ann.id);
                              }}
                              className="text-red-400 hover:text-red-300 p-0.5 rounded hover:bg-red-950/50"
                              title="Delete Annotation"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-300 line-clamp-3 leading-snug">{ann.text}</p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/60">
                          <span>By: {ann.author}</span>
                          <span>{new Date(ann.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
        </svg>
      </div>
    </div>
  );
};
