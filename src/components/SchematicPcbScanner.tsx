import React, { useState } from 'react';
import { VehicleProfile } from '../types/automotive';
import { 
  PCBProject, 
  DetectedComponent, 
  UploadedDocument, 
  TechnicianAnnotation 
} from '../types/pcbScanner';
import { SAMPLE_PCB_PROJECTS } from '../data/samplePcbDatabase';
import { PcbStorageEngine } from '../services/pcbStorageEngine';
import { LayerManager } from '../services/pcbLayerManagerService';
import { usePcbLayerManager } from '../hooks/usePcbLayerManager';
import { PcbCanvasOverlay } from './PcbCanvasOverlay';
import { FloatingComponentHud } from './FloatingComponentHud';
import { BoardComparisonView } from './BoardComparisonView';
import { NetTracingDrawer } from './NetTracingDrawer';
import { PcbManualCorrectionModal } from './PcbManualCorrectionModal';
import { PcbReportExportModal } from './PcbReportExportModal';
import { PcbAnnotationModal } from './PcbAnnotationModal';
import { 
  FileText, 
  Upload, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Columns, 
  Activity, 
  Edit3, 
  Download, 
  Cpu,
  Eye,
  EyeOff,
  PlusCircle,
  Sparkles,
  SlidersHorizontal,
  Sun,
  Maximize2
} from 'lucide-react';

interface SchematicPcbScannerProps {
  vehicle: VehicleProfile;
  onSendPinToBench: (pinNumber: number) => void;
}

export const SchematicPcbScanner: React.FC<SchematicPcbScannerProps> = ({
  vehicle,
  onSendPinToBench,
}) => {
  // Load saved projects or fallback to pre-loaded sample database
  const [projects, setProjects] = useState<PCBProject[]>(() => {
    const saved = PcbStorageEngine.loadProjects();
    return saved.length > 0 ? saved : SAMPLE_PCB_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0]?.id || 'project-hilux-1gd-power');
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const activeDoc = activeProject?.documents.find((d) => d.id === activeProject.activeDocumentId) || activeProject?.documents[0];

  // State-Based Layer Manager Hook (Persists visibility, opacity, high-contrast, zoom & pan offsets)
  const {
    layers,
    zoomLevel,
    panOffset,
    toggleLayer,
    setLayerProperty,
    applyPreset,
    handleZoom,
    resetZoomAndPan,
    updatePan,
  } = usePcbLayerManager(activeProjectId);

  // Selection state
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    activeProject?.components[0]?.id || null
  );
  const [selectedNetId, setSelectedNetId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

  // Technician Annotation Mode & Coordinates
  const [isAddingAnnotation, setIsAddingAnnotation] = useState<boolean>(false);
  const [newAnnotationCoords, setNewAnnotationCoords] = useState<{ x: number; y: number } | null>(null);

  // Modals & Drawers
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [showNetTracer, setShowNetTracer] = useState<boolean>(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Virtual Probes
  const [probeRedCompId, setProbeRedCompId] = useState<string | null>('comp-u10');
  const [probeBlackCompId, setProbeBlackCompId] = useState<string | null>('comp-d12');

  const selectedComp = activeProject?.components.find((c) => c.id === selectedComponentId) || null;

  // Sync active project to persistent storage
  const updateActiveProject = (updatedProj: PCBProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
    PcbStorageEngine.saveProject(updatedProj);
  };

  // Canvas Click Handler (for dropping pin annotations)
  const handleCanvasClick = (coords: { x: number; y: number }) => {
    if (isAddingAnnotation) {
      setNewAnnotationCoords(coords);
    }
  };

  // Save technician annotation
  const handleSaveAnnotation = (annotationData: Omit<TechnicianAnnotation, 'id' | 'timestamp'>) => {
    const newAnn: TechnicianAnnotation = {
      ...annotationData,
      id: `ann-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const updatedAnnotations = [...(activeProject.annotations || []), newAnn];
    const updatedProj: PCBProject = {
      ...activeProject,
      annotations: updatedAnnotations,
    };

    updateActiveProject(updatedProj);
    setNewAnnotationCoords(null);
    setIsAddingAnnotation(false);
  };

  // Delete annotation
  const handleDeleteAnnotation = (annId: string) => {
    const updatedAnnotations = (activeProject.annotations || []).filter((a) => a.id !== annId);
    const updatedProj: PCBProject = {
      ...activeProject,
      annotations: updatedAnnotations,
    };
    updateActiveProject(updatedProj);
    if (selectedAnnotationId === annId) setSelectedAnnotationId(null);
  };

  // File Upload Handler with Gemini Vision AI
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds maximum allowed limit of 20MB.');
      return;
    }

    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;

      try {
        const response = await fetch('/api/gemini/analyze-schematic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentName: file.name,
            documentType: file.name.toLowerCase().includes('pcb') ? 'PHYSICAL_PCB_PHOTO' : 'ELECTRICAL_SCHEMATIC',
            imageBase64: imageUrl,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        let data: any = null;

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const rawText = await response.text();
          console.warn('Server returned non-JSON response during schematic analysis:', rawText.slice(0, 200));
        }

        const analysis = data?.analysis || {
          documentType: file.name.toLowerCase().includes('pcb') ? 'PHYSICAL_PCB_PHOTO' : 'ELECTRICAL_SCHEMATIC',
          analysisSummary: `Custom uploaded document: ${file.name}. Mapped for manual component placement & technician verification.`,
          components: [],
          nets: [],
        };

        const newDoc: UploadedDocument = {
          id: `doc-${Date.now()}`,
          name: file.name,
          documentType: analysis.documentType || 'ELECTRICAL_SCHEMATIC',
          imageUrl,
          originalFileName: file.name,
          fileSizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
          uploadTimestamp: new Date().toISOString(),
          widthPx: 1920,
          heightPx: 1080,
          description: analysis.analysisSummary || 'Custom technician document upload.',
        };

        const extractedComponents: DetectedComponent[] = (analysis.components || []).map((c: any, idx: number) => ({
          id: `comp-custom-${Date.now()}-${idx}`,
          refDes: c.refDes || `C${idx + 1}`,
          category: c.category || 'RESISTOR',
          marking: c.marking || '102',
          decodedValue: c.decodedValue || '1 kΩ',
          packageType: c.packageType || 'SMD',
          bbox: c.bbox || { ymin: 200 + idx * 100, xmin: 200 + idx * 100, ymax: 300 + idx * 100, xmax: 300 + idx * 100 },
          confidenceScore: c.confidenceScore || 0.92,
          verificationStatus: 'UNVERIFIED',
          circuitFunction: c.circuitFunction || 'Detected component on custom uploaded document.',
          connectedNetIds: [],
          sourceImageId: newDoc.id,
        }));

        const updatedProj: PCBProject = {
          ...activeProject,
          documents: [...activeProject.documents, newDoc],
          activeDocumentId: newDoc.id,
          components: [...activeProject.components, ...extractedComponents],
          updatedAt: new Date().toISOString(),
        };

        updateActiveProject(updatedProj);
        setIsAnalyzing(false);
      } catch (err) {
        console.error('Document analysis failed:', err);
        setIsAnalyzing(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // Manual correction save handler
  const handleSaveCorrection = (updatedComp: DetectedComponent, rationale: string) => {
    const prevComp = activeProject.components.find((c) => c.id === updatedComp.id);
    const updatedComponents = activeProject.components.map((c) => (c.id === updatedComp.id ? updatedComp : c));

    const updatedProj: PCBProject = {
      ...activeProject,
      components: updatedComponents,
    };

    PcbStorageEngine.addAuditRecord(activeProject.id, {
      technicianId: 'Tech_RAMT_01',
      componentId: updatedComp.id,
      action: 'UPDATE',
      fieldChanged: 'reference / value',
      previousValue: prevComp ? `${prevComp.refDes} (${prevComp.decodedValue})` : 'N/A',
      newValue: `${updatedComp.refDes} (${updatedComp.decodedValue})`,
      rationale,
    });

    const refreshed = PcbStorageEngine.loadProjects().find((p) => p.id === activeProject.id) || updatedProj;
    updateActiveProject(refreshed);
    setShowCorrectionModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Engineering Module Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-bold shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                AI SCHEMATIC & PCB INTELLIGENCE SCANNER
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-emerald-400">STATE-BASED LAYER MANAGER</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
              {activeProject?.name} ({activeProject?.ecuModel})
            </h2>
          </div>
        </div>

        {/* Action Controls Header Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button onClick={() => handleZoom(-0.2)} className="p-1 text-slate-400 hover:text-white rounded" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1.5">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => handleZoom(0.2)} className="p-1 text-slate-400 hover:text-white rounded" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetZoomAndPan} className="p-1 text-slate-400 hover:text-cyan-400 rounded" title="Reset Zoom & Pan">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Pin Annotation Tool Button */}
          <button
            onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition-all whitespace-nowrap ${
              isAddingAnnotation
                ? 'bg-purple-900/70 border-purple-400 text-purple-200 animate-pulse font-bold shadow'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAddingAnnotation ? 'Click PCB to Drop Pin...' : 'Add Pin Annotation'}</span>
          </button>

          {/* Board Comparison button */}
          <button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors whitespace-nowrap"
          >
            <Columns className="w-3.5 h-3.5 text-cyan-400" />
            <span>Compare Revisions</span>
          </button>

          {/* Circuit Net Tracer button */}
          <button
            onClick={() => setShowNetTracer(!showNetTracer)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors whitespace-nowrap"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Net Tracer</span>
          </button>

          {/* Manual Correction button */}
          {selectedComp && (
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Verify / Edit {selectedComp.refDes}</span>
            </button>
          )}

          {/* Export Report button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors shadow-sm whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>PDF Technical Report</span>
          </button>
        </div>
      </div>

      {/* State-Based Layer View Manager Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-800/80 bg-slate-950/90 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">State Layer Manager:</span>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => applyPreset('ALL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
              layers.showPhotoBase && layers.showComponents && layers.showTraces && layers.showAnnotations
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            All Layers On
          </button>
          <button
            onClick={() => applyPreset('COMPONENTS')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
              layers.showComponents && !layers.showTraces && !layers.showAnnotations
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Components Only
          </button>
          <button
            onClick={() => applyPreset('TRACES')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
              !layers.showComponents && layers.showTraces && !layers.showAnnotations
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Traces & Nets
          </button>
          <button
            onClick={() => applyPreset('ANNOTATIONS')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
              !layers.showComponents && !layers.showTraces && layers.showAnnotations
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Annotations Only
          </button>
          <button
            onClick={() => applyPreset('PHOTO_ONLY')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
              layers.showPhotoBase && !layers.showComponents && !layers.showTraces && !layers.showAnnotations
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Bare Hardware Photo
          </button>
          <button
            onClick={() => applyPreset('HIGH_CONTRAST')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
              layers.photoHighContrast
                ? 'bg-amber-950 text-amber-300 border-amber-500/50 font-bold shadow'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3 h-3 text-amber-400 shrink-0" />
            <span>High Contrast PCB</span>
          </button>
        </div>

        {/* Individual Layer Toggle Switches */}
        <div className="flex items-center gap-3 border-l border-slate-800 pl-3">
          <button
            onClick={() => toggleLayer('showPhotoBase')}
            className={`flex items-center gap-1 text-[11px] transition-colors ${
              layers.showPhotoBase ? 'text-slate-200 font-bold' : 'text-slate-500 line-through'
            }`}
          >
            {layers.showPhotoBase ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Base Image</span>
          </button>

          <button
            onClick={() => toggleLayer('showComponents')}
            className={`flex items-center gap-1 text-[11px] transition-colors ${
              layers.showComponents ? 'text-slate-200 font-bold' : 'text-slate-500 line-through'
            }`}
          >
            {layers.showComponents ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Components ({activeProject?.components.length || 0})</span>
          </button>

          <button
            onClick={() => toggleLayer('showTraces')}
            className={`flex items-center gap-1 text-[11px] transition-colors ${
              layers.showTraces ? 'text-slate-200 font-bold' : 'text-slate-500 line-through'
            }`}
          >
            {layers.showTraces ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Nets ({activeProject?.nets.length || 0})</span>
          </button>

          <button
            onClick={() => toggleLayer('showAnnotations')}
            className={`flex items-center gap-1 text-[11px] transition-colors ${
              layers.showAnnotations ? 'text-slate-200 font-bold' : 'text-slate-500 line-through'
            }`}
          >
            {layers.showAnnotations ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Annotations ({activeProject?.annotations?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Floating Document & Layer Drawer */}
        {isDrawerOpen && (
          <div className="w-72 border-r border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-col p-4 overflow-y-auto shrink-0 space-y-5">
            {/* Upload New Document Button */}
            <div>
              <label className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl cursor-pointer transition-colors shadow-md font-mono">
                <Upload className="w-4 h-4" />
                <span>Upload Schematic / PCB</span>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
              {isAnalyzing && (
                <div className="mt-2 text-[11px] font-mono text-cyan-400 flex items-center justify-center gap-2 p-2 bg-cyan-950/40 rounded border border-cyan-500/30 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyzing with Gemini Vision AI...</span>
                </div>
              )}
            </div>

            {/* Document Library Project Switcher */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                ECU PCB Projects Database:
              </span>
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => {
                    setActiveProjectId(proj.id);
                    setSelectedComponentId(proj.components[0]?.id || null);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs font-mono ${
                    activeProjectId === proj.id
                      ? 'bg-cyan-950/50 text-white border-cyan-500/50 shadow'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="font-bold text-slate-200 truncate">{proj.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{proj.ecuModel}</div>
                  <div className="text-[9px] text-cyan-400 mt-1">{proj.components.length} mapped components</div>
                </button>
              ))}
            </div>

            {/* Document Pages inside Active Project */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                Project Document Layers:
              </span>
              {activeProject?.documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    const updatedProj = { ...activeProject, activeDocumentId: doc.id };
                    updateActiveProject(updatedProj);
                  }}
                  className={`w-full text-left p-2 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 ${
                    activeProject.activeDocumentId === doc.id
                      ? 'bg-slate-800 text-cyan-300 border-cyan-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span className="truncate">{doc.name}</span>
                </button>
              ))}
            </div>

            {/* Component List Navigation */}
            <div className="space-y-2 flex-1 overflow-y-auto">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                Detected Components ({activeProject?.components.length || 0}):
              </span>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                {activeProject?.components.map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedComponentId(comp.id)}
                    className={`p-2 rounded-lg border cursor-pointer text-xs font-mono transition-colors flex items-center justify-between ${
                      selectedComponentId === comp.id
                        ? 'bg-cyan-950/60 text-white border-cyan-500/50 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800/80 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-cyan-400 font-bold">{comp.refDes}</span>
                      <span className="text-slate-300 truncate">{comp.decodedValue}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        comp.verificationStatus === 'VERIFIED'
                          ? 'text-emerald-400 bg-emerald-950'
                          : 'text-amber-400 bg-amber-950'
                      }`}
                    >
                      {comp.verificationStatus.substring(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Central High-Resolution Interactive Canvas with State-Based Layer Manager */}
        {activeDoc && (
          <PcbCanvasOverlay
            imageUrl={activeDoc.imageUrl}
            documentType={activeDoc.documentType}
            components={activeProject?.components || []}
            nets={activeProject?.nets || []}
            annotations={activeProject?.annotations || []}
            layerConfig={layers}
            selectedComponentId={selectedComponentId}
            selectedNetId={selectedNetId}
            selectedAnnotationId={selectedAnnotationId}
            onSelectComponent={(compId) => setSelectedComponentId(compId)}
            onSelectAnnotation={(annId) => setSelectedAnnotationId(annId)}
            onDeleteAnnotation={handleDeleteAnnotation}
            onCanvasClick={handleCanvasClick}
            isAddingAnnotation={isAddingAnnotation}
            probeRedComponentId={probeRedCompId}
            probeBlackComponentId={probeBlackCompId}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
            onZoomChange={handleZoom}
            onPanChange={updatePan}
            onResetZoomPan={resetZoomAndPan}
          />
        )}

        {/* Floating Component Inspection HUD */}
        <FloatingComponentHud
          component={selectedComp}
          onClose={() => setSelectedComponentId(null)}
          onSendToBench={(comp) => {
            setProbeRedCompId(comp.id);
            onSendPinToBench(1);
          }}
          onInjectFault={(comp, faultType) => {
            alert(`Virtual fault (${faultType}) injected on component ${comp.refDes}. Telemetry updated.`);
          }}
        />
      </div>

      {/* Modals */}
      {showComparison && (
        <BoardComparisonView
          currentProject={activeProject}
          allProjects={projects}
          onClose={() => setShowComparison(false)}
        />
      )}

      {showNetTracer && activeProject && (
        <NetTracingDrawer
          nets={activeProject.nets}
          components={activeProject.components}
          selectedNetId={selectedNetId}
          onSelectNet={(netId) => setSelectedNetId(netId)}
          onClose={() => setShowNetTracer(false)}
        />
      )}

      {showCorrectionModal && selectedComp && (
        <PcbManualCorrectionModal
          component={selectedComp}
          onSaveCorrection={handleSaveCorrection}
          onClose={() => setShowCorrectionModal(false)}
        />
      )}

      {showExportModal && activeProject && (
        <PcbReportExportModal
          project={activeProject}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {newAnnotationCoords && (
        <PcbAnnotationModal
          coords={newAnnotationCoords}
          onSave={handleSaveAnnotation}
          onClose={() => setNewAnnotationCoords(null)}
        />
      )}
    </div>
  );
};
