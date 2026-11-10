import React, { useState } from 'react';
import { 
  WIRING_SYSTEMS, 
  WiringDiagramSystem 
} from '../data/wiringDiagramData';
import { WiringNode, WiringTrace, VehicleProfile } from '../types/automotive';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  Zap,
  Sliders,
  Power
} from 'lucide-react';

interface WiringDiagramExplorerProps {
  vehicle: VehicleProfile;
  onSelectPinForBench?: (pinNumber: number) => void;
  highlightedPins?: { pinA: number; pinB: number } | null;
}

export const WiringDiagramExplorer: React.FC<WiringDiagramExplorerProps> = ({
  vehicle,
  onSelectPinForBench,
  highlightedPins = null,
}) => {
  const [selectedSystemId, setSelectedSystemId] = useState<string>(WIRING_SYSTEMS[0].id);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [injectedCircuitFault, setInjectedCircuitFault] = useState<string>('NONE');

  React.useEffect(() => {
    if (highlightedPins) {
      const pinA = highlightedPins.pinA;
      if (pinA === 1 || pinA === 4 || pinA === 5 || pinA === 10) {
        setSelectedSystemId('sys-crdi-power');
        setSelectedTraceId('trace-relay-to-ecu-b1');
      } else if (pinA === 1 || pinA === 2 || pinA === 3 || pinA === 4 || pinA === 6) {
        setSelectedSystemId('sys-sensor-5v-crdi');
        setSelectedTraceId('trace-vc-to-splice');
      } else {
        setSelectedSystemId('sys-can-network');
        setSelectedTraceId('trace-can-high');
      }
    }
  }, [highlightedPins]);

  const activeSystem = WIRING_SYSTEMS.find((s) => s.id === selectedSystemId) || WIRING_SYSTEMS[0];
  const activeTrace = activeSystem.traces.find((t) => t.id === selectedTraceId);
  const activeNode = activeSystem.nodes.find((n) => n.id === selectedNodeId);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(2.0, Math.max(0.6, prev + delta)));
  };

  const getNodeColor = (type: WiringNode['type']) => {
    switch (type) {
      case 'BATTERY':
        return 'fill-amber-950/80 stroke-amber-500 text-amber-300';
      case 'FUSE':
        return 'fill-orange-950/80 stroke-orange-500 text-orange-300';
      case 'MAIN_RELAY':
        return 'fill-indigo-950/80 stroke-indigo-400 text-indigo-300';
      case 'IGNITION_SWITCH':
        return 'fill-yellow-950/80 stroke-yellow-500 text-yellow-300';
      case 'SENSOR':
        return 'fill-cyan-950/80 stroke-cyan-400 text-cyan-300';
      case 'ACTUATOR':
        return 'fill-emerald-950/80 stroke-emerald-500 text-emerald-300';
      case 'ECU_PIN':
        return 'fill-blue-950/80 stroke-blue-400 text-blue-200';
      case 'CHASSIS_GROUND':
        return 'fill-slate-900 stroke-slate-500 text-slate-400';
      default:
        return 'fill-slate-900 stroke-slate-700 text-slate-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-workstation-bg text-slate-100">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-b border-white/5 bg-workstation-panel/60">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Layers className="w-4 h-4 text-workstation-accent shrink-0" />
            <span className="font-semibold text-slate-200 whitespace-nowrap">Circuit System:</span>
          </div>
          <div className="flex items-center gap-1 bg-workstation-bg p-1 rounded-lg border border-white/5 overflow-x-auto max-w-full">
            {WIRING_SYSTEMS.map((sys) => (
              <button
                key={sys.id}
                onClick={() => {
                  setSelectedSystemId(sys.id);
                  setSelectedTraceId(null);
                  setSelectedNodeId(null);
                }}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedSystemId === sys.id
                    ? 'bg-workstation-accent/10 text-workstation-accent border border-workstation-accent/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sys.name}
              </button>
            ))}
          </div>
        </div>

        {/* Fault Injection Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Simulate Fault:</span>
          </div>
          <select
            value={injectedCircuitFault}
            onChange={(e) => setInjectedCircuitFault(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="NONE">None (Normal Circuit)</option>
            <option value="OPEN_FUSE">Blown 30A EFI Fuse (Open Circuit)</option>
            <option value="SHORT_5V_GND">5V Reference Shorted to Ground</option>
            <option value="CORRODED_GND">High Resistance Ground (+20Ω Drop)</option>
            <option value="OPEN_CAN_TERM">Missing 120Ω CAN Terminator</option>
          </select>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-workstation-bg p-1 rounded-md border border-white/5 sm:ml-2">
            <button
              onClick={() => handleZoom(-0.15)}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.15)}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1.0)}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Diagram Area with Split Side Info Panel */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* SVG Diagram Canvas */}
        <div className="flex-1 relative overflow-auto tech-grid p-6 select-none">
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              transition: 'transform 0.1s ease-out',
            }}
            className="min-w-[900px] min-h-[550px] relative"
          >
            <svg
              className="w-[960px] h-[560px] bg-workstation-bg/70 border border-white/5 rounded-xl shadow-2xl"
              viewBox="0 0 960 560"
            >
              {/* Grid Background Lines inside SVG */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.25)" strokeWidth="0.8" />
                </pattern>
                <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06b6d4" />
                </filter>
                <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f43f5e" />
                </filter>
              </defs>
              <rect width="960" height="560" fill="url(#grid)" />

              {/* Title & Vehicle Header inside SVG */}
              <text x="30" y="35" className="fill-slate-400 font-mono text-[12px] font-semibold tracking-wide">
                WIRING SCHEMATIC: {activeSystem.name.toUpperCase()}
              </text>
              <text x="30" y="52" className="fill-slate-500 font-mono text-[10px]">
                PLATFORM: {vehicle.make} {vehicle.model} ({vehicle.engineCode}) · SOURCE: OEM EWD VERIFIED
              </text>

              {/* Draw Wire Traces */}
              {activeSystem.traces.map((trace) => {
                const isSelected = selectedTraceId === trace.id;
                const isFaulted =
                  (injectedCircuitFault === 'OPEN_FUSE' && trace.id.includes('efi-fuse')) ||
                  (injectedCircuitFault === 'SHORT_5V_GND' && trace.id.includes('5v')) ||
                  (injectedCircuitFault === 'CORRODED_GND' && trace.id.includes('ground'));

                // Find connected node coordinates in order
                const nodePoints = trace.nodeIds
                  .map((nId) => activeSystem.nodes.find((n) => n.id === nId))
                  .filter((n): n is WiringNode => n !== undefined);

                if (nodePoints.length < 2) return null;

                // Build SVG path string with orthogonal elbows
                let pathD = `M ${nodePoints[0].x} ${nodePoints[0].y}`;
                for (let i = 1; i < nodePoints.length; i++) {
                  const prev = nodePoints[i - 1];
                  const curr = nodePoints[i];
                  // Orthogonal routing
                  const midX = (prev.x + curr.x) / 2;
                  pathD += ` L ${midX} ${prev.y} L ${midX} ${curr.y} L ${curr.x} ${curr.y}`;
                }

                let strokeColor = '#38bdf8'; // sky blue default
                if (trace.wireColor.startsWith('R')) strokeColor = '#f43f5e'; // red
                if (trace.wireColor.startsWith('B-R')) strokeColor = '#fb923c'; // orange
                if (trace.wireColor.startsWith('W-B')) strokeColor = '#94a3b8'; // white/black
                if (trace.wireColor.startsWith('G')) strokeColor = '#22c55e'; // green
                if (trace.wireColor.startsWith('LG')) strokeColor = '#4ade80'; // light green

                if (isFaulted) strokeColor = '#e11d48';

                return (
                  <g
                    key={trace.id}
                    onClick={() => {
                      setSelectedTraceId(trace.id);
                      setSelectedNodeId(null);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Broad transparent hit area for easy clicking */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="20"
                    />

                    {/* Outer glow line if selected or faulted */}
                    {isSelected && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={isFaulted ? '#f43f5e' : '#06b6d4'}
                        strokeWidth="6"
                        strokeOpacity="0.4"
                      />
                    )}

                    {/* Primary wire line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? '3.5' : '2.5'}
                      strokeDasharray={isFaulted ? '6 4' : 'none'}
                      className="transition-all duration-150"
                    />

                    {/* Wire Color Tag Label */}
                    {nodePoints.length >= 2 && (
                      <g
                        transform={`translate(${(nodePoints[0].x + nodePoints[1].x) / 2}, ${(nodePoints[0].y + nodePoints[1].y) / 2 - 8})`}
                      >
                        <rect
                          x="-18"
                          y="-8"
                          width="36"
                          height="14"
                          rx="3"
                          className="fill-slate-900 stroke-slate-700/80"
                        />
                        <text
                          textAnchor="middle"
                          y="2"
                          className="font-mono text-[9px] font-bold fill-slate-200"
                        >
                          {trace.wireColor}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Draw Components & Connector Nodes */}
              {activeSystem.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isECUPin = node.type === 'ECU_PIN';
                const nodeStyle = getNodeColor(node.type);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setSelectedTraceId(null);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Node Boundary Box */}
                    <rect
                      x="-65"
                      y="-25"
                      width="130"
                      height="50"
                      rx="6"
                      className={`${nodeStyle} stroke-2 transition-all ${
                        isSelected ? 'ring-2 ring-cyan-400 stroke-cyan-400' : ''
                      }`}
                    />

                    {/* Node Type Label */}
                    <text
                      x="0"
                      y="-8"
                      textAnchor="middle"
                      className="font-mono text-[9px] font-semibold uppercase tracking-wider fill-slate-400"
                    >
                      {node.type.replace('_', ' ')}
                    </text>

                    {/* Node Main Title */}
                    <text
                      x="0"
                      y="7"
                      textAnchor="middle"
                      className="font-sans text-[11px] font-bold fill-white"
                    >
                      {node.label}
                    </text>

                    {/* Rating or Voltage subtitle */}
                    {node.ratingOrValue && (
                      <text
                        x="0"
                        y="18"
                        textAnchor="middle"
                        className="font-mono text-[9px] fill-cyan-400"
                      >
                        {node.ratingOrValue}
                      </text>
                    )}

                    {/* Pin Contact Terminal Circles */}
                    <circle cx="-65" cy="0" r="4" className="fill-slate-300 stroke-slate-900 stroke-2" />
                    <circle cx="65" cy="0" r="4" className="fill-slate-300 stroke-slate-900 stroke-2" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Info Inspection Drawer */}
        <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 bg-workstation-panel/90 flex flex-col p-3 sm:p-4 overflow-y-auto max-h-[320px] lg:max-h-none">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Info className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">Circuit Inspection</h3>
          </div>

          {activeTrace && (
            <div className="mt-4 space-y-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  Selected Wire Trace
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">{activeTrace.name}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Circuit Type: {activeTrace.circuitType.replace('_', ' ')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Wire Color</span>
                  <span className="font-bold text-slate-200">{activeTrace.wireColor}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Wire Gauge</span>
                  <span className="font-bold text-slate-200">{activeTrace.wireGauge}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nominal Voltage</span>
                  <span className="font-bold text-emerald-400">{activeTrace.nominalVoltage} V</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Typical Current</span>
                  <span className="font-bold text-slate-200">{activeTrace.currentNormalAmps} A</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Trace Path Sequence:
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  {activeTrace.nodeIds.map((nId, idx) => {
                    const node = activeSystem.nodes.find((n) => n.id === nId);
                    return (
                      <div
                        key={nId}
                        className="flex items-center gap-2 p-1.5 bg-slate-800/60 rounded border border-slate-800"
                      >
                        <span className="text-slate-500 text-[10px]">{idx + 1}.</span>
                        <span className="text-slate-200">{node?.label || nId}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeNode && (
            <div className="mt-4 space-y-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  Component / Pin Details
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">{activeNode.label}</h4>
                <p className="text-xs text-slate-400 mt-1">{activeNode.componentName}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                <div>
                  <span className="text-slate-500 font-mono block text-[11px]">Component Type</span>
                  <span className="font-semibold text-slate-200">{activeNode.type.replace('_', ' ')}</span>
                </div>
                {activeNode.ratingOrValue && (
                  <div>
                    <span className="text-slate-500 font-mono block text-[11px]">Specification</span>
                    <span className="font-semibold text-emerald-400 font-mono">{activeNode.ratingOrValue}</span>
                  </div>
                )}
              </div>

              {activeNode.type === 'ECU_PIN' && onSelectPinForBench && (
                <button
                  onClick={() => {
                    // Extract pin number from label or default to Pin 1
                    const match = activeNode.label.match(/\d+/);
                    const pinNum = match ? parseInt(match[0], 10) : 1;
                    onSelectPinForBench(pinNum);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Send to Virtual Bench</span>
                </button>
              )}
            </div>
          )}

          {!activeTrace && !activeNode && (
            <div className="flex flex-col items-center justify-center text-center p-6 my-auto text-slate-500">
              <Zap className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
              <p className="text-xs">
                Click on any wire run or component node on the schematic to inspect electrical path and test points.
              </p>
            </div>
          )}

          {/* Fault warning if active */}
          {injectedCircuitFault !== 'NONE' && (
            <div className="mt-auto pt-4 border-t border-slate-800">
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Active Electrical Fault</span>
                </div>
                <p className="text-slate-300">
                  {injectedCircuitFault === 'OPEN_FUSE' && 'EFI fuse is blown. Circuit open. +B power feed is dead.'}
                  {injectedCircuitFault === 'SHORT_5V_GND' && 'Sensor 5V reference is shorted to vehicle frame. Voltage is 0.0V.'}
                  {injectedCircuitFault === 'CORRODED_GND' && 'Corroded ground eyelet introduces 20Ω resistance and 0.4V ground offset.'}
                  {injectedCircuitFault === 'OPEN_CAN_TERM' && 'Termination resistor missing. Waveform reflections will trigger U0100.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
