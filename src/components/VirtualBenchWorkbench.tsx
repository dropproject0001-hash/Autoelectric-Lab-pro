import React, { useState, useEffect, useRef } from 'react';
import { 
  VehicleProfile, 
  ConnectorPin, 
  ElectricalFault, 
  BenchReading,
  MeasurementEvaluation 
} from '../types/automotive';
import { 
  calculateElectricalState, 
  SimulationEnvironment, 
  SimulationResult,
  findPin
} from '../services/electricalSimulationEngine';
import { 
  Power, 
  Activity, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Save, 
  HelpCircle,
  Play,
  Square,
  ShieldAlert,
  RotateCw,
  Unplug,
  Key,
  Info,
  Layers,
  Gauge
} from 'lucide-react';

interface VirtualBenchWorkbenchProps {
  vehicle: VehicleProfile;
  initialPinNumber?: number | null;
  onLogReading: (reading: BenchReading) => void;
  onAskAiAboutReading: (reading: BenchReading) => void;
}

export const VirtualBenchWorkbench: React.FC<VirtualBenchWorkbenchProps> = ({
  vehicle,
  initialPinNumber = null,
  onLogReading,
  onAskAiAboutReading,
}) => {
  // Mobile vs Desktop responsive initial layout mode
  const [layoutMode, setLayoutMode] = useState<'SPLIT' | 'CONNECTOR' | 'INSTRUMENTS'>('CONNECTOR');

  useEffect(() => {
    // If desktop screen (>= 1024px), default to SPLIT view
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setLayoutMode('SPLIT');
    }
  }, []);

  // Connector Orientation (ECU Male Receptacle vs Female Harness Plug Mirrored)
  const [viewOrientation, setViewOrientation] = useState<'RECEPTACLE' | 'HARNESS_PLUG'>('RECEPTACLE');

  // Probe Assignment Target Mode ('RED' or 'BLACK')
  const [activeProbeTarget, setActiveProbeTarget] = useState<'RED' | 'BLACK'>('RED');

  // Power Supply State
  const [psVoltageSet, setPsVoltageSet] = useState<number>(13.8);
  const [psCurrentLimitSet, setPsCurrentLimitSet] = useState<number>(2.0);
  const [psOutputEnabled, setPsOutputEnabled] = useState<boolean>(true);
  const [psReversePolarity, setPsReversePolarity] = useState<boolean>(false);

  // Power Pin Connections
  const allVehiclePins = vehicle.connectors.flatMap((c) => c.pins);
  const defaultBattPin = allVehiclePins.find((p) => p.signalType === 'POWER_BATT')?.pinNumber || 1;
  const defaultIgnPin = allVehiclePins.find((p) => p.signalType === 'POWER_IGN')?.pinNumber || 4;
  const defaultGndPin = allVehiclePins.find((p) => p.signalType === 'GROUND_POWER')?.pinNumber || 5;

  const [connectedBattPin, setConnectedBattPin] = useState<number | null>(defaultBattPin);
  const [connectedIgnPin, setConnectedIgnPin] = useState<number | null>(defaultIgnPin);
  const [connectedGroundPin, setConnectedGroundPin] = useState<number | null>(defaultGndPin);

  // Multimeter Probes State
  const [mmMode, setMmMode] = useState<'VOLTAGE_DC' | 'VOLTAGE_AC' | 'RESISTANCE' | 'DIODE' | 'CONTINUITY'>('VOLTAGE_DC');
  const [redProbePin, setRedProbePin] = useState<number | null>(initialPinNumber || 1);
  const [redProbeConnectorId, setRedProbeConnectorId] = useState<string | null>(
    allVehiclePins.find((p) => p.pinNumber === (initialPinNumber || 1))?.connectorId || null
  );
  const [blackProbePin, setBlackProbePin] = useState<number | null>(defaultGndPin);
  const [blackProbeConnectorId, setBlackProbeConnectorId] = useState<string | null>(
    allVehiclePins.find((p) => p.pinNumber === defaultGndPin)?.connectorId || null
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Oscilloscope State
  const [scopeRunning, setScopeRunning] = useState<boolean>(true);
  const [scopeTimebaseMs, setScopeTimebaseMs] = useState<number>(5.0);
  const [scopeVoltsPerDiv, setScopeVoltsPerDiv] = useState<number>(5.0);
  const [activeTab, setActiveTab] = useState<'POWER_DMM' | 'OSCILLOSCOPE' | 'FAULT_INJECTION' | 'GUIDED_TESTS'>('POWER_DMM');

  // Simulation Sliders
  const [simulatedRPM, setSimulatedRPM] = useState<number>(750);
  const [simulatedRailPressureBar, setSimulatedRailPressureBar] = useState<number>(380);
  const [simulatedBoostKpa, setSimulatedBoostKpa] = useState<number>(101);
  const [scvDutyCyclePct, setScvDutyCyclePct] = useState<number>(35);
  const [showEngineParams, setShowEngineParams] = useState<boolean>(false);

  // Fault Injection State
  const [activeFault, setActiveFault] = useState<ElectricalFault>({
    id: 'fault-none',
    name: 'Normal Operation',
    description: 'No electrical fault injected.',
    faultType: 'NONE',
    affectedCircuits: [],
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync initial pin selection if prop changes
  useEffect(() => {
    if (initialPinNumber !== null && initialPinNumber !== undefined) {
      setRedProbePin(initialPinNumber);
      const matched = allVehiclePins.find((p) => p.pinNumber === initialPinNumber);
      if (matched) setRedProbeConnectorId(matched.connectorId);
    }
  }, [initialPinNumber]);

  // Calculate live electrical physics
  const env: SimulationEnvironment = {
    powerSupply: {
      voltageSet: psVoltageSet,
      currentLimitSet: psCurrentLimitSet,
      outputEnabled: psOutputEnabled,
      reversePolarity: psReversePolarity,
    },
    connectedPowerPins: {
      battPin: connectedBattPin,
      ignPin: connectedIgnPin,
      groundPin: connectedGroundPin,
    },
    multimeter: {
      mode: mmMode,
      redProbePin,
      redProbeConnectorId,
      blackProbePin,
      blackProbeConnectorId,
    },
    activeFault,
    simulatedRPM,
    simulatedRailPressureBar,
    simulatedBoostKpa,
    scvDutyCyclePct,
  };

  const simResult: SimulationResult = calculateElectricalState(vehicle, env);

  // Oscilloscope Animation Loop
  useEffect(() => {
    if (!scopeRunning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const render = () => {
      offset = (offset + 1) % 120;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.15)';
      ctx.lineWidth = 1;

      const gridSpacingX = canvas.width / 10;
      const gridSpacingY = canvas.height / 8;

      for (let x = 0; x <= canvas.width; x += gridSpacingX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSpacingY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Center Ground Line
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Channel 1 Waveform (Phosphor Green)
      const pts1 = simResult.waveformCh1;
      if (pts1 && pts1.length > 1) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 4;
        ctx.beginPath();

        const midY = canvas.height / 2;
        const scaleY = (canvas.height / 8) / scopeVoltsPerDiv;

        pts1.forEach((pt, idx) => {
          const shiftedIdx = (idx + offset) % pts1.length;
          const px = (idx / (pts1.length - 1)) * canvas.width;
          const py = midY - (pts1[shiftedIdx]?.voltage || 0) * scaleY;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw Channel 2 Waveform (Cyan)
      const pts2 = simResult.waveformCh2;
      if (pts2 && pts2.length > 1) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 3;
        ctx.beginPath();

        const midY = canvas.height / 2;
        const scaleY = (canvas.height / 8) / scopeVoltsPerDiv;

        pts2.forEach((pt, idx) => {
          const shiftedIdx = (idx + offset) % pts2.length;
          const px = (idx / (pts2.length - 1)) * canvas.width;
          const py = midY - (pts2[shiftedIdx]?.voltage || 0) * scaleY;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [simResult, scopeRunning, scopeVoltsPerDiv]);

  // Audio Beeper for Continuity Mode
  useEffect(() => {
    if (simResult.multimeter.isBeeping && soundEnabled && typeof window !== 'undefined') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        const timer = setTimeout(() => {
          osc.stop();
          audioCtx.close();
        }, 120);
        return () => clearTimeout(timer);
      } catch (e) {
        // AudioContext disabled or blocked
      }
    }
  }, [simResult.multimeter.isBeeping, soundEnabled]);

  const redPinObj = redProbePin !== null ? findPin(vehicle, redProbePin, redProbeConnectorId) : null;
  const blackPinObj = blackProbePin !== null ? findPin(vehicle, blackProbePin, blackProbeConnectorId) : null;

  const handlePinClick = (pin: ConnectorPin) => {
    if (activeProbeTarget === 'RED') {
      setRedProbePin(pin.pinNumber);
      setRedProbeConnectorId(pin.connectorId);
    } else {
      setBlackProbePin(pin.pinNumber);
      setBlackProbeConnectorId(pin.connectorId);
    }
  };

  const handleSaveCurrentReading = () => {
    if (!redPinObj) return;
    const reading: BenchReading = {
      id: `read-${Date.now()}`,
      pinNumber: redPinObj.pinNumber,
      connectorId: redPinObj.connectorId,
      pinLabel: redPinObj.label,
      measurementType: mmMode,
      measuredValue: simResult.multimeter.value ?? 0,
      unit: simResult.multimeter.unit,
      expectedMin: redPinObj.nominalVoltageMin,
      expectedMax: redPinObj.nominalVoltageMax,
      status: simResult.multimeter.evaluation,
      notes: `Supply ${psVoltageSet}V (${simResult.powerSupply.powerState}). ${simResult.multimeter.explanation}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    onLogReading(reading);
  };

  const renderEvaluationBadge = (evaluation: MeasurementEvaluation) => {
    switch (evaluation) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>PASS (OEM SPEC)</span>
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/80 border border-rose-500/50 text-rose-400 font-bold text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>FAIL (OUT OF SPEC)</span>
          </span>
        );
      case 'OPEN_CIRCUIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-400 font-bold text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>OPEN CIRCUIT</span>
          </span>
        );
      case 'SHORT_CIRCUIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950 border border-rose-500 text-rose-300 font-bold animate-pulse text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>SHORT CIRCUIT</span>
          </span>
        );
      case 'INVALID_CONNECTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-950/80 border border-orange-500/50 text-orange-400 font-bold text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>INVALID PROBE</span>
          </span>
        );
      case 'UNVERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-950/80 border border-yellow-500/50 text-yellow-400 font-bold text-[11px]">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>UNVERIFIED</span>
          </span>
        );
      case 'NOT_APPLICABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-400 font-bold text-[11px]">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>NOT APPLICABLE</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top Bench Telemetry Bar & Responsive Layout Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                simResult.powerSupply.isOvercurrent
                  ? 'bg-rose-500 animate-pulse'
                  : psOutputEnabled
                  ? 'bg-emerald-400'
                  : 'bg-slate-600'
              }`}
            />
            <span className="font-bold text-slate-200 text-[11px] sm:text-xs">
              STATE: {simResult.powerSupply.powerState}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <span className="text-slate-400 text-[11px] sm:text-xs">
            DRAIN: <strong className="text-cyan-400">{simResult.powerSupply.quiescentDrawMa} mA</strong>
          </span>

          <span className="text-slate-700">|</span>

          <span className="text-slate-400 text-[11px] sm:text-xs">
            FAULT: <strong className={activeFault.faultType === 'NONE' ? 'text-emerald-400' : 'text-rose-400'}>{activeFault.name}</strong>
          </span>

          {/* Toggle Engine Simulation Sliders Drawer */}
          <button
            onClick={() => setShowEngineParams(!showEngineParams)}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 ml-auto sm:ml-2"
          >
            <Gauge className="w-3 h-3" />
            <span className="hidden xs:inline">Engine: {simulatedRPM} RPM</span>
          </button>
        </div>

        {/* View Layout Switcher (Mobile & Desktop) */}
        <div className="flex items-center self-end sm:self-auto bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setLayoutMode('SPLIT')}
            className={`px-2 py-1 text-[11px] font-mono rounded transition-colors whitespace-nowrap ${
              layoutMode === 'SPLIT'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">Split View</span>
            <span className="sm:hidden">Both</span>
          </button>
          <button
            onClick={() => setLayoutMode('CONNECTOR')}
            className={`px-2 py-1 text-[11px] font-mono rounded transition-colors whitespace-nowrap ${
              layoutMode === 'CONNECTOR'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Connectors
          </button>
          <button
            onClick={() => setLayoutMode('INSTRUMENTS')}
            className={`px-2 py-1 text-[11px] font-mono rounded transition-colors whitespace-nowrap ${
              layoutMode === 'INSTRUMENTS'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Instruments
          </button>
        </div>
      </div>

      {/* Expandable Engine Parameters Ribbon */}
      {showEngineParams && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-6 py-2 bg-slate-950 border-b border-slate-800 text-[11px] font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">RPM:</span>
            <input
              type="range"
              min="0"
              max="4500"
              step="50"
              value={simulatedRPM}
              onChange={(e) => setSimulatedRPM(Number(e.target.value))}
              className="w-20 accent-cyan-400 h-1"
            />
            <span className="text-slate-200 tabular-nums w-10">{simulatedRPM}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Rail:</span>
            <input
              type="range"
              min="0"
              max="2000"
              step="20"
              value={simulatedRailPressureBar}
              onChange={(e) => setSimulatedRailPressureBar(Number(e.target.value))}
              className="w-20 accent-amber-400 h-1"
            />
            <span className="text-slate-200 tabular-nums w-14">{simulatedRailPressureBar} bar</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">SCV:</span>
            <input
              type="range"
              min="10"
              max="90"
              step="1"
              value={scvDutyCyclePct}
              onChange={(e) => setScvDutyCyclePct(Number(e.target.value))}
              className="w-16 accent-emerald-400 h-1"
            />
            <span className="text-slate-200 tabular-nums w-8">{scvDutyCyclePct}%</span>
          </div>
        </div>
      )}

      {/* Main Workbench Body: Clean flex-col on mobile, flex-row on desktop */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        {/* Left Side: Interactive ECU Sockets & Probe Docking Bay */}
        {(layoutMode === 'SPLIT' || layoutMode === 'CONNECTOR') && (
          <div className="flex-1 w-full min-w-0 flex flex-col p-3 sm:p-5 lg:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-800 tech-grid">
            {/* Workbench Top Controls & Active Probe Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  Test Bench · {vehicle.chassisCode}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">
                  {vehicle.make} {vehicle.model} ({vehicle.ecuManufacturer} {vehicle.ecuModel})
                </h3>
              </div>

              {/* Probe Docking Selector & Orientation Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Active Probe Selection Mode Toggle */}
                <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 text-[10px] px-1.5 uppercase font-bold">Dock:</span>
                  <button
                    onClick={() => setActiveProbeTarget('RED')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
                      activeProbeTarget === 'RED'
                        ? 'bg-rose-500 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-300" />
                    <span>Red (+)</span>
                  </button>
                  <button
                    onClick={() => setActiveProbeTarget('BLACK')}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
                      activeProbeTarget === 'BLACK'
                        ? 'bg-slate-700 text-slate-100 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Black (-)</span>
                  </button>
                </div>

                {/* Mirrored Orientation Toggle */}
                <button
                  onClick={() =>
                    setViewOrientation((prev) => (prev === 'RECEPTACLE' ? 'HARNESS_PLUG' : 'RECEPTACLE'))
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
                  title="Toggle between ECU male pin view and mirrored harness female socket view"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px]">
                    {viewOrientation === 'RECEPTACLE' ? 'ECU (Front)' : 'Harness (Back)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Probe Placement Status Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                  <span className="text-slate-400">RED (+):</span>
                  <span className="text-rose-300 font-bold">
                    {redPinObj ? `#${redPinObj.pinNumber} (${redPinObj.label})` : 'DISCONNECTED'}
                  </span>
                  {redPinObj && (
                    <button
                      onClick={() => setRedProbePin(null)}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded ml-1"
                      title="Disconnect Red Probe"
                    >
                      <Unplug className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <span className="text-slate-700">|</span>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-600" />
                  <span className="text-slate-400">BLACK (-):</span>
                  <span className="text-slate-200 font-bold">
                    {blackPinObj ? `#${blackPinObj.pinNumber} (${blackPinObj.label})` : 'DISCONNECTED'}
                  </span>
                  {blackPinObj && (
                    <button
                      onClick={() => setBlackProbePin(null)}
                      className="text-slate-500 hover:text-slate-200 p-0.5 rounded ml-1"
                      title="Disconnect Black Probe"
                    >
                      <Unplug className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-cyan-400 font-medium">
                Tap any pin to connect {activeProbeTarget === 'RED' ? 'Red (+)' : 'Black (-)'}
              </div>
            </div>

            {/* Central ECU Metal Receptacle Visualization */}
            <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-3 sm:p-5 shadow-2xl relative mb-6">
              <div className="flex flex-wrap items-center justify-between mb-3 pb-2 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm" />
                  <span className="font-mono text-xs font-bold text-slate-200 uppercase truncate">
                    {vehicle.ecuManufacturer} {vehicle.ecuModel} ({viewOrientation})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  {viewOrientation === 'HARNESS_PLUG' && (
                    <span className="text-amber-400 font-bold">
                      [MIRRORED HARNESS SOCKET VIEW]
                    </span>
                  )}
                  <span>KEY: TOP</span>
                </div>
              </div>

              {/* Render all vehicle connector sockets */}
              <div className="space-y-4">
                {vehicle.connectors.map((conn) => {
                  const displayPins = viewOrientation === 'HARNESS_PLUG' 
                    ? [...conn.pins].reverse() 
                    : conn.pins;

                  return (
                    <div key={conn.id} className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-semibold text-slate-300">
                          {conn.name} ({conn.pins.length} Positions)
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]">
                          {conn.receptacleType}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {displayPins.map((pin) => {
                          const isRed = redProbePin === pin.pinNumber && (!redProbeConnectorId || redProbeConnectorId === pin.connectorId);
                          const isBlack = blackProbePin === pin.pinNumber && (!blackProbeConnectorId || blackProbeConnectorId === pin.connectorId);
                          const isBatt = connectedBattPin === pin.pinNumber;
                          const isIgn = connectedIgnPin === pin.pinNumber;
                          const isGnd = connectedGroundPin === pin.pinNumber;
                          const isBlank = !pin.isPopulated || pin.signalType === 'RESERVED_NC';

                          let borderClass = 'border-slate-800 bg-slate-900 text-slate-300 hover:border-cyan-500/60';
                          if (isBlank) {
                            borderClass = 'border-dashed border-slate-800/80 bg-slate-950/40 text-slate-600 hover:border-slate-700';
                          }
                          if (isRed) borderClass = 'border-rose-500 bg-rose-950/60 text-rose-300 ring-2 ring-rose-500 font-bold';
                          if (isBlack) borderClass = 'border-slate-400 bg-slate-800 text-slate-100 ring-2 ring-slate-400 font-bold';
                          if (isBatt && !isRed && !isBlack) borderClass = 'border-amber-500 bg-amber-950/50 text-amber-300 font-semibold';
                          if (isGnd && !isRed && !isBlack) borderClass = 'border-emerald-500 bg-emerald-950/50 text-emerald-300 font-semibold';

                          return (
                            <div key={`${conn.id}-${pin.pinNumber}`} className="relative group">
                              <button
                                onClick={() => handlePinClick(pin)}
                                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center transition-all ${borderClass}`}
                                title={`Pin #${pin.pinNumber} (${pin.label}): ${pin.functionDesc}`}
                              >
                                <span className="text-[10px] sm:text-[11px] font-mono font-bold leading-none">
                                  {pin.pinNumber}
                                </span>
                                <span className="text-[7px] sm:text-[8px] font-mono text-cyan-400 truncate max-w-[36px] sm:max-w-[42px] leading-tight mt-0.5">
                                  {isBlank ? 'NC' : pin.label.split(' ')[0]}
                                </span>
                              </button>

                              {/* Quick probe assignment tooltip / popup */}
                              <div className="hidden group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 z-20 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded shadow-lg text-[10px] font-mono whitespace-nowrap gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRedProbePin(pin.pinNumber);
                                    setRedProbeConnectorId(pin.connectorId);
                                  }}
                                  className="text-rose-400 hover:underline"
                                >
                                  Red(+)
                                </button>
                                <span className="text-slate-600">|</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBlackProbePin(pin.pinNumber);
                                    setBlackProbeConnectorId(pin.connectorId);
                                  }}
                                  className="text-slate-300 hover:underline"
                                >
                                  Black(-)
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Power Feed Assignment Bar */}
            <div className="bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-3 mb-6">
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800 gap-2">
                <span className="font-semibold text-slate-300">ECU Power Feed Terminals on Bench:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConnectedIgnPin(connectedIgnPin ? null : defaultIgnPin)}
                    className={`flex items-center gap-1 px-2.5 py-0.5 text-[10px] rounded border font-semibold transition-colors ${
                      connectedIgnPin
                        ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Key className="w-3 h-3" />
                    <span>{connectedIgnPin ? 'Key ON' : 'Key OFF'}</span>
                  </button>

                  <button
                    onClick={() => setConnectedGroundPin(connectedGroundPin ? null : defaultGndPin)}
                    className={`flex items-center gap-1 px-2.5 py-0.5 text-[10px] rounded border font-semibold transition-colors ${
                      connectedGroundPin
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                        : 'bg-rose-950 text-rose-300 border-rose-500/50'
                    }`}
                  >
                    <span>{connectedGroundPin ? 'GND Normal' : 'GND Open'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Battery +12V (+B)</span>
                  <select
                    value={connectedBattPin || ''}
                    onChange={(e) => setConnectedBattPin(e.target.value ? Number(e.target.value) : null)}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-400 font-mono truncate"
                  >
                    <option value="">(Disconnected)</option>
                    {allVehiclePins.map((p) => (
                      <option key={`batt-${p.connectorId}-${p.pinNumber}`} value={p.pinNumber}>
                        {p.connectorName} - Pin #{p.pinNumber} ({p.label})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Ignition Switched (IGSW)</span>
                  <select
                    value={connectedIgnPin || ''}
                    onChange={(e) => setConnectedIgnPin(e.target.value ? Number(e.target.value) : null)}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono truncate"
                  >
                    <option value="">(Disconnected - Key OFF)</option>
                    {allVehiclePins.map((p) => (
                      <option key={`ign-${p.connectorId}-${p.pinNumber}`} value={p.pinNumber}>
                        {p.connectorName} - Pin #{p.pinNumber} ({p.label})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Power Ground (E01)</span>
                  <select
                    value={connectedGroundPin || ''}
                    onChange={(e) => setConnectedGroundPin(e.target.value ? Number(e.target.value) : null)}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-mono truncate"
                  >
                    <option value="">(Disconnected - Open GND)</option>
                    {allVehiclePins.map((p) => (
                      <option key={`gnd-${p.connectorId}-${p.pinNumber}`} value={p.pinNumber}>
                        {p.connectorName} - Pin #{p.pinNumber} ({p.label})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Virtual Diagnostic Instrument Rack */}
        {(layoutMode === 'SPLIT' || layoutMode === 'INSTRUMENTS') && (
          <div className="w-full lg:w-[460px] xl:w-[480px] shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/90 overflow-y-auto">
            {/* Instrument Rack Mode Selector */}
            <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800 shrink-0">
              {[
                { id: 'POWER_DMM', label: 'Supply & DMM' },
                { id: 'OSCILLOSCOPE', label: 'Oscilloscope' },
                { id: 'FAULT_INJECTION', label: 'Faults' },
                { id: 'GUIDED_TESTS', label: 'Guided Tests' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-3 sm:p-5 space-y-5 flex-1">
              {/* TAB 1: POWER SUPPLY & DIGITAL MULTIMETER */}
              {activeTab === 'POWER_DMM' && (
                <>
                  {/* DC Power Supply Rack */}
                  <div className="bg-slate-950 border-2 border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl relative">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-mono font-bold text-slate-200">
                          BENCH POWER SUPPLY (0-30V)
                        </span>
                      </div>
                      <button
                        onClick={() => setPsOutputEnabled(!psOutputEnabled)}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold font-mono rounded transition-colors ${
                          psOutputEnabled
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{psOutputEnabled ? 'OUTPUT ON' : 'OUTPUT OFF'}</span>
                      </button>
                    </div>

                    {/* Dual Digital LED Readouts */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-black/90 p-2.5 rounded-lg border border-slate-800 text-center">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">
                          Actual Voltage
                        </span>
                        <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-400 tabular-nums">
                          {simResult.powerSupply.actualVoltage.toFixed(2)}
                        </span>
                        <span className="text-xs font-mono text-slate-500 ml-1">V</span>
                      </div>

                      <div className="bg-black/90 p-2.5 rounded-lg border border-slate-800 text-center">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">
                          Current Draw
                        </span>
                        <span
                          className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums ${
                            simResult.powerSupply.isOvercurrent ? 'text-rose-500' : 'text-cyan-400'
                          }`}
                        >
                          {simResult.powerSupply.actualCurrent.toFixed(3)}
                        </span>
                        <span className="text-xs font-mono text-slate-500 ml-1">A</span>
                      </div>
                    </div>

                    {/* Sliders */}
                    <div className="space-y-2.5 text-xs font-mono">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Set Voltage: {psVoltageSet.toFixed(1)} V</span>
                          <div className="flex gap-1">
                            {[12.0, 13.8, 14.4].map((v) => (
                              <button
                                key={v}
                                onClick={() => setPsVoltageSet(v)}
                                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-[10px] rounded border border-slate-700"
                              >
                                {v}V
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="24"
                          step="0.1"
                          value={psVoltageSet}
                          onChange={(e) => setPsVoltageSet(Number(e.target.value))}
                          className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Current Limit: {psCurrentLimitSet.toFixed(1)} A</span>
                          <div className="flex gap-1">
                            {[1.0, 2.0, 3.0, 5.0].map((a) => (
                              <button
                                key={a}
                                onClick={() => setPsCurrentLimitSet(a)}
                                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-[10px] rounded border border-slate-700"
                              >
                                {a}A
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="5.0"
                          step="0.1"
                          value={psCurrentLimitSet}
                          onChange={(e) => setPsCurrentLimitSet(Number(e.target.value))}
                          className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded"
                        />
                      </div>
                    </div>

                    {simResult.powerSupply.isOvercurrent && (
                      <div className="mt-2.5 p-2 bg-rose-950/60 border border-rose-500 rounded text-[11px] font-mono text-rose-300 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>CURRENT LIMIT CLAMP ACTIVATED (V-I Foldback)</span>
                      </div>
                    )}
                  </div>

                  {/* Digital Multimeter Rack */}
                  <div className="bg-slate-950 border-2 border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-mono font-bold text-slate-200">
                          TRUE-RMS DIGITAL MULTIMETER
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSoundEnabled(!soundEnabled)}
                          className="p-1 text-slate-400 hover:text-white rounded"
                          title="Toggle Continuity Beeper Audio"
                        >
                          {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-600" />}
                        </button>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                          AUTO
                        </span>
                      </div>
                    </div>

                    {/* Multimeter LCD Screen */}
                    <div className="bg-emerald-950/20 border-2 border-emerald-900/60 p-3 sm:p-4 rounded-xl text-center relative mb-3">
                      <div className="flex justify-between items-center text-[10px] font-mono text-emerald-500/80 mb-1">
                        <span>AUTO · TRUE RMS</span>
                        <span className="font-bold">{mmMode.replace('_', ' ')}</span>
                      </div>

                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-3xl sm:text-4xl font-mono font-extrabold text-emerald-400 tabular-nums tracking-wider">
                          {simResult.multimeter.displayString}
                        </span>
                        <span className="text-sm sm:text-base font-mono font-bold text-emerald-400">
                          {simResult.multimeter.unit}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-center text-xs font-mono">
                        {renderEvaluationBadge(simResult.multimeter.evaluation)}
                      </div>
                    </div>

                    {/* Multimeter Mode Selector Tabs */}
                    <div className="grid grid-cols-5 gap-1 mb-3 text-xs font-mono">
                      {[
                        { id: 'VOLTAGE_DC', label: 'V DC' },
                        { id: 'VOLTAGE_AC', label: 'V AC' },
                        { id: 'RESISTANCE', label: 'Ω Ohm' },
                        { id: 'DIODE', label: 'Diode' },
                        { id: 'CONTINUITY', label: 'Cont.' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMmMode(m.id as any)}
                          className={`py-1.5 rounded text-center transition-colors text-[11px] ${
                            mmMode === m.id
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500 font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Diagnostic Explanation */}
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1 mb-3">
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase font-mono">
                        Diagnostic Evaluation:
                      </span>
                      <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                        {simResult.multimeter.explanation}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveCurrentReading}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Log Reading</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!redPinObj) return;
                          const reading: BenchReading = {
                            id: `read-${Date.now()}`,
                            pinNumber: redPinObj.pinNumber,
                            connectorId: redPinObj.connectorId,
                            pinLabel: redPinObj.label,
                            measurementType: mmMode,
                            measuredValue: simResult.multimeter.value ?? 0,
                            unit: simResult.multimeter.unit,
                            expectedMin: redPinObj.nominalVoltageMin,
                            expectedMax: redPinObj.nominalVoltageMax,
                            status: simResult.multimeter.evaluation,
                            notes: simResult.multimeter.explanation,
                            timestamp: new Date().toLocaleTimeString(),
                          };
                          onAskAiAboutReading(reading);
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Consult AI</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: 4-CHANNEL OSCILLOSCOPE */}
              {activeTab === 'OSCILLOSCOPE' && (
                <div className="space-y-4">
                  <div className="bg-black border-2 border-slate-800 rounded-xl p-3 shadow-2xl relative">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                      <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" /> DSO-4000 STORAGE OSCILLOSCOPE
                      </span>
                      <button
                        onClick={() => setScopeRunning(!scopeRunning)}
                        className={`flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                          scopeRunning ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                        }`}
                      >
                        {scopeRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{scopeRunning ? 'STOP' : 'RUN'}</span>
                      </button>
                    </div>

                    {/* Oscilloscope Canvas */}
                    <div className="w-full overflow-hidden rounded-lg bg-black border border-slate-800">
                      <canvas
                        ref={canvasRef}
                        width={440}
                        height={240}
                        className="w-full h-auto block"
                      />
                    </div>

                    {/* Channel Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono bg-slate-950 p-2.5 rounded border border-slate-800">
                      <div>
                        <span className="text-slate-500 block text-[10px]">CH1 Vpp</span>
                        <span className="text-emerald-400 font-bold">{simResult.signalMetrics.ch1Vpp} V</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Frequency</span>
                        <span className="text-emerald-400 font-bold">{simResult.signalMetrics.ch1FreqHz} Hz</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Duty Cycle</span>
                        <span className="text-emerald-400 font-bold">{simResult.signalMetrics.ch1DutyCycle} %</span>
                      </div>
                    </div>
                  </div>

                  {/* Oscilloscope Timebase and Volts/Div controls */}
                  <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-3 text-xs font-mono">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-400">CH1 Scale:</span>
                      <div className="flex flex-wrap gap-1">
                        {[1.0, 2.0, 5.0, 10.0, 20.0].map((v) => (
                          <button
                            key={v}
                            onClick={() => setScopeVoltsPerDiv(v)}
                            className={`px-2 py-1 rounded text-[11px] ${
                              scopeVoltsPerDiv === v
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {v}V
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-400">Timebase:</span>
                      <div className="flex flex-wrap gap-1">
                        {[1.0, 2.0, 5.0, 10.0, 20.0].map((t) => (
                          <button
                            key={t}
                            onClick={() => setScopeTimebaseMs(t)}
                            className={`px-2 py-1 rounded text-[11px] ${
                              scopeTimebaseMs === t
                                ? 'bg-cyan-400 text-slate-950 font-bold'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {t}ms
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ELECTRICAL FAULT INJECTION */}
              {activeTab === 'FAULT_INJECTION' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-slate-200">
                      BENCH ELECTRICAL FAULT INJECTION
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Inject physical faults to observe DMM, power supply foldback, and waveform changes.
                  </p>

                  <div className="space-y-2">
                    {[
                      {
                        id: 'fault-none',
                        name: 'None (Healthy Circuit)',
                        type: 'NONE',
                        desc: 'Standard nominal voltages and waveform behavior.',
                      },
                      {
                        id: 'fault-short-gnd',
                        name: 'Direct Short to Ground (0.05Ω)',
                        type: 'SHORT_TO_GND',
                        desc: 'Simulates harness pinched to chassis or shorted internal semiconductor.',
                      },
                      {
                        id: 'fault-short-batt',
                        name: 'Short to +12V Battery Rail',
                        type: 'SHORT_TO_BATT',
                        desc: 'Simulates harness melt bridging 12V line to sensor circuit.',
                      },
                      {
                        id: 'fault-corroded-gnd',
                        name: 'Corroded Ground Eyelet (+20Ω)',
                        type: 'POOR_GROUND_20_OHM',
                        desc: 'High ground resistance causing 0.4V ground voltage offset.',
                      },
                      {
                        id: 'fault-open',
                        name: 'Open Circuit (Broken Wire)',
                        type: 'OPEN_CIRCUIT',
                        desc: 'Wire harness cut or pin pushed back in socket.',
                      },
                    ].map((fault) => (
                      <button
                        key={fault.id}
                        onClick={() =>
                          setActiveFault({
                            id: fault.id,
                            name: fault.name,
                            description: fault.desc,
                            faultType: fault.type as any,
                            affectedCircuits: [],
                          })
                        }
                        className={`w-full p-2.5 sm:p-3 rounded-lg border text-left transition-all ${
                          activeFault.id === fault.id
                            ? 'bg-rose-950/40 border-rose-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-slate-200">
                            {fault.name}
                          </span>
                          {activeFault.id === fault.id && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500 text-slate-950 font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{fault.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: GUIDED AUTOMOTIVE BENCH PROCEDURES */}
              {activeTab === 'GUIDED_TESTS' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-slate-200">
                      STEP-BY-STEP OEM BENCH PROCEDURES
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {[
                      {
                        title: '1. ECU Battery Supply & Wake-Up Test',
                        steps: 'Connect 13.8V to +B (Pin 1) & IGSW (Pin 4). Ground to E01/ME01 (Pin 5). Current draw must be 300-380mA.',
                        targetPin: 1,
                        targetMode: 'VOLTAGE_DC',
                      },
                      {
                        title: '2. 5V Sensor Reference Integrity Test',
                        steps: 'With ECU awake, measure Pin 1 on Connector B (VC). Must read 4.95V - 5.05V with zero load.',
                        targetPin: 1,
                        targetMode: 'VOLTAGE_DC',
                      },
                      {
                        title: '3. CAN Bus 120Ω Internal Termination Test',
                        steps: 'Power Supply OFF. Measure resistance between CAN-H (Pin 1) and CAN-L (Pin 2). Must read 120Ω.',
                        targetPin: 1,
                        targetMode: 'RESISTANCE',
                      },
                      {
                        title: '4. Injector Low-Side Clamp Diode Drop',
                        steps: 'Power Supply OFF. DMM in Diode mode. Red probe on Pin 1 (#10), Black on Ground (Pin 5). Must read ~0.55V.',
                        targetPin: 1,
                        targetMode: 'DIODE',
                      },
                    ].map((proc, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5"
                      >
                        <h5 className="font-bold text-cyan-400">{proc.title}</h5>
                        <p className="text-slate-400 text-[11px] leading-relaxed">{proc.steps}</p>
                        <button
                          onClick={() => {
                            setMmMode(proc.targetMode as any);
                            setActiveTab('POWER_DMM');
                          }}
                          className="text-[11px] font-mono text-cyan-400 hover:underline pt-1 inline-block"
                        >
                          Configure Instruments for this Test →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom HUD for Mobile / Connector View Mode */}
      {layoutMode === 'CONNECTOR' && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-cyan-500/40 p-2.5 sm:p-3 px-4 sm:px-6 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between font-mono text-xs gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">DMM:</span>
              <span className="text-base sm:text-lg font-bold text-emerald-400 tabular-nums">
                {simResult.multimeter.displayString} {simResult.multimeter.unit}
              </span>
            </div>
            {renderEvaluationBadge(simResult.multimeter.evaluation)}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveCurrentReading}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded text-[11px]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Log</span>
            </button>
            <button
              onClick={() => setLayoutMode('INSTRUMENTS')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 text-[11px]"
            >
              <span>Instruments →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
