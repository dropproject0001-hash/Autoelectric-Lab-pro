import React, { useState, useEffect, useRef } from 'react';
import { VehicleProfile, ConnectorPin, SignalType, VerificationLevel, ElectricalFault } from '../types/automotive';
import { calculateElectricalState, SimulationEnvironment } from '../services/electricalSimulationEngine';
import { 
  Layers, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  Zap, 
  RotateCw, 
  FileText,
  ShieldCheck,
  ChevronRight,
  PieChart,
  CheckCircle2,
  Cpu,
  Activity,
  Sliders,
  Power,
  Key,
  ShieldAlert,
  Info,
  Camera,
  Maximize2,
  Crosshair,
  Check
} from 'lucide-react';

import densoHeaderImg from '../assets/images/ecu_denso_header_1794333481637.jpg';
import transtronHeaderImg from '../assets/images/ecu_transtron_header_1794333480671.jpg';
import continentalHeaderImg from '../assets/images/ecu_continental_header_1794333480989.jpg';
import benchProbeGuideImg from '../assets/images/ecu_bench_pin_probe_guide_1794333496324.jpg';

interface EcuPinoutExplorerProps {
  vehicle: VehicleProfile;
  selectedPinNumber: number | null;
  onSelectPin: (pinNumber: number) => void;
  onSendToBench?: (pinNumber: number) => void;
}

// Wire color code parser with exact visual swatches
const parseWireColor = (code: string) => {
  const colorMap: Record<string, { bg: string; text: string; name: string }> = {
    B: { bg: '#0f172a', text: '#ffffff', name: 'Black' },
    W: { bg: '#f8fafc', text: '#0f172a', name: 'White' },
    R: { bg: '#ef4444', text: '#ffffff', name: 'Red' },
    G: { bg: '#22c55e', text: '#ffffff', name: 'Green' },
    LG: { bg: '#4ade80', text: '#0f172a', name: 'Light Green' },
    L: { bg: '#3b82f6', text: '#ffffff', name: 'Blue' },
    Y: { bg: '#eab308', text: '#0f172a', name: 'Yellow' },
    BR: { bg: '#78350f', text: '#ffffff', name: 'Brown' },
    P: { bg: '#ec4899', text: '#ffffff', name: 'Pink' },
    V: { bg: '#8b5cf6', text: '#ffffff', name: 'Violet' },
    O: { bg: '#f97316', text: '#ffffff', name: 'Orange' },
    GR: { bg: '#64748b', text: '#ffffff', name: 'Gray' },
    SB: { bg: '#38bdf8', text: '#0f172a', name: 'Sky Blue' },
    NC: { bg: '#334155', text: '#94a3b8', name: 'Unpopulated Cavity' },
  };

  const parts = code.split('-');
  const primary = colorMap[parts[0]] || { bg: '#64748b', text: '#ffffff', name: parts[0] };
  const stripe = parts[1] ? colorMap[parts[1]] : null;

  return { primary, stripe, code };
};

export const EcuPinoutExplorer: React.FC<EcuPinoutExplorerProps> = ({
  vehicle,
  selectedPinNumber,
  onSelectPin,
  onSendToBench,
}) => {
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>(
    vehicle.connectors[0]?.id || ''
  );
  const [viewOrientation, setViewOrientation] = useState<'RECEPTACLE' | 'HARNESS_PLUG'>('RECEPTACLE');
  const [visualDisplayMode, setVisualDisplayMode] = useState<'HARDWARE_PHOTO' | 'PROBE_GUIDE_PHOTO' | 'CAVITY_MATRIX'>('HARDWARE_PHOTO');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [signalFilter, setSignalFilter] = useState<string>('ALL');

  // Interactive Live Pin Electrical Simulator state
  const [simPowerOn, setSimPowerOn] = useState<boolean>(true);
  const [simKeyOn, setSimKeyOn] = useState<boolean>(true);
  const [simFaultType, setSimFaultType] = useState<string>('NONE');
  const [simRpm, setSimRpm] = useState<number>(800);
  const [simRailBar, setSimRailBar] = useState<number>(350);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Map appropriate realistic ECU photo by manufacturer
  const getEcuPhoto = () => {
    const mfg = vehicle.ecuManufacturer.toLowerCase();
    if (mfg.includes('transtron')) return transtronHeaderImg;
    if (mfg.includes('continental')) return continentalHeaderImg;
    return densoHeaderImg;
  };

  const activeConnector =
    vehicle.connectors.find((c) => c.id === selectedConnectorId) || vehicle.connectors[0];

  const allPins = vehicle.connectors.flatMap((c) => c.pins);
  const selectedPin = allPins.find((p) => p.pinNumber === selectedPinNumber && p.connectorId === activeConnector?.id) || 
    activeConnector?.pins.find((p) => p.pinNumber === selectedPinNumber) || 
    activeConnector?.pins[0];

  const activeCompleteness = vehicle.completenessReports?.find(
    (c) => c.connectorId === activeConnector?.id
  ) || {
    connectorId: activeConnector?.id || '',
    connectorName: activeConnector?.name || '',
    totalCavities: activeConnector?.pinCount || 34,
    populatedCount: activeConnector?.pins.filter((p) => p.isPopulated).length || 28,
    verifiedCount: activeConnector?.pins.filter((p) => p.verificationLevel === 'VERIFIED').length || 26,
    unverifiedCount: activeConnector?.pins.filter((p) => p.verificationLevel === 'UNVERIFIED').length || 2,
    blankCount: activeConnector?.pins.filter((p) => !p.isPopulated).length || 6,
    completenessPct: 92.8,
  };

  // Build live simulation calculation for selected pin
  const defaultBattPin = vehicle.connectors.flatMap(c => c.pins).find(p => p.signalType === 'POWER_BATT')?.pinNumber || 1;
  const defaultIgnPin = vehicle.connectors.flatMap(c => c.pins).find(p => p.signalType === 'POWER_IGN')?.pinNumber || 4;
  const defaultGndPin = vehicle.connectors.flatMap(c => c.pins).find(p => p.signalType === 'GROUND_POWER')?.pinNumber || 5;

  const currentFault: ElectricalFault = {
    id: `fault-${simFaultType}`,
    name: simFaultType.replace(/_/g, ' '),
    description: `Simulated fault on pin #${selectedPin?.pinNumber}`,
    faultType: simFaultType as any,
    affectedCircuits: selectedPin ? [selectedPin.label] : [],
  };

  const simEnv: SimulationEnvironment = {
    powerSupply: {
      voltageSet: 13.8,
      currentLimitSet: 2.0,
      outputEnabled: simPowerOn,
      reversePolarity: false,
    },
    connectedPowerPins: {
      battPin: defaultBattPin,
      ignPin: simKeyOn ? defaultIgnPin : null,
      groundPin: defaultGndPin,
    },
    multimeter: {
      mode: 'VOLTAGE_DC',
      redProbePin: selectedPin ? selectedPin.pinNumber : null,
      redProbeConnectorId: selectedPin ? selectedPin.connectorId : null,
      blackProbePin: defaultGndPin,
      blackProbeConnectorId: 'conn-a',
    },
    activeFault: currentFault,
    simulatedRPM: simRpm,
    simulatedRailPressureBar: simRailBar,
    simulatedBoostKpa: 101,
    scvDutyCyclePct: 35,
  };

  const simResult = calculateElectricalState(vehicle, simEnv);

  // Live mini waveform canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 20) {
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 15) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      if (!simPowerOn || !selectedPin || !selectedPin.isPopulated || selectedPin.signalType === 'RESERVED_NC') {
        // Flat zero line
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h - 10);
        ctx.lineTo(w, h - 10);
        ctx.stroke();
        return;
      }

      ctx.strokeStyle = '#06b6d4'; // cyan waveform
      ctx.lineWidth = 2;
      ctx.beginPath();

      const measuredV = simResult.multimeter.value ?? 0;
      const baselineY = h - Math.min(h - 10, Math.max(10, (measuredV / 15) * (h - 20) + 10));

      if (selectedPin.signalType === 'ACTUATOR_LOW_SIDE' || selectedPin.label.includes('SCV') || selectedPin.label.includes('INJ')) {
        // PWM / Pulse waveform
        const period = 30;
        const dutyRatio = 0.35;
        for (let x = 0; x < w; x++) {
          const phase = (x + time * 40) % period;
          const y = phase < period * dutyRatio ? h - 35 : h - 10;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else if (selectedPin.signalType === 'SENSOR_VR_IN' || selectedPin.label.includes('NE+') || selectedPin.label.includes('CKP')) {
        // Inductive VR sine wave
        const freq = (simRpm / 60) * 0.15;
        for (let x = 0; x < w; x++) {
          const y = baselineY + Math.sin(x * 0.1 + time * freq * 10) * 12;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else if (selectedPin.signalType === 'CAN_HIGH' || selectedPin.signalType === 'CAN_LOW') {
        // CAN Differential Bus square pulses
        const period = 15;
        for (let x = 0; x < w; x++) {
          const phase = (x + time * 60) % period;
          const noise = Math.sin(x * 0.8) * 2;
          const y = phase < 7 ? baselineY - 8 + noise : baselineY + 8 + noise;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else {
        // Flat DC level with slight analog ripple
        for (let x = 0; x < w; x++) {
          const ripple = (Math.sin(x * 0.1 + time * 5) * 0.8) + (Math.random() * 0.4);
          const y = baselineY + ripple;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [simPowerOn, selectedPin, simResult, simRpm, simRailBar]);

  // Filtering
  const filteredPins = (activeConnector?.pins || []).filter((pin) => {
    const matchesSearch =
      pin.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pin.functionDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pin.pinNumber.toString().includes(searchQuery);

    if (!matchesSearch) return false;

    if (signalFilter === 'ALL') return true;
    if (signalFilter === 'POWER' && (pin.signalType === 'POWER_BATT' || pin.signalType === 'POWER_IGN')) return true;
    if (signalFilter === 'GROUND' && (pin.signalType === 'GROUND_POWER' || pin.signalType === 'GROUND_LOGIC' || pin.signalType === 'SENSOR_GROUND')) return true;
    if (signalFilter === 'SENSOR_5V' && pin.signalType === 'SENSOR_5V_REF') return true;
    if (signalFilter === 'SENSOR' && (pin.signalType === 'SENSOR_ANALOG_IN' || pin.signalType === 'SENSOR_DIGITAL_IN' || pin.signalType === 'SENSOR_VR_IN')) return true;
    if (signalFilter === 'ACTUATOR' && (pin.signalType === 'ACTUATOR_LOW_SIDE' || pin.signalType === 'ACTUATOR_HIGH_SIDE')) return true;
    if (signalFilter === 'BUS' && (pin.signalType === 'CAN_HIGH' || pin.signalType === 'CAN_LOW' || pin.signalType === 'LIN_BUS' || pin.signalType === 'K_LINE')) return true;

    return false;
  });

  const getSignalBadgeColor = (type: SignalType) => {
    switch (type) {
      case 'POWER_BATT':
      case 'POWER_IGN':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
      case 'GROUND_POWER':
      case 'GROUND_LOGIC':
      case 'SENSOR_GROUND':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
      case 'SENSOR_5V_REF':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30';
      case 'SENSOR_ANALOG_IN':
      case 'SENSOR_DIGITAL_IN':
      case 'SENSOR_VR_IN':
        return 'text-sky-400 bg-sky-950/40 border-sky-500/30';
      case 'ACTUATOR_LOW_SIDE':
      case 'ACTUATOR_HIGH_SIDE':
        return 'text-rose-400 bg-rose-950/40 border-rose-500/30';
      case 'CAN_HIGH':
      case 'CAN_LOW':
        return 'text-purple-400 bg-purple-950/40 border-purple-500/30';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  const getPinCircleColor = (pin: ConnectorPin, isSelected: boolean) => {
    if (isSelected) return 'bg-cyan-400 text-slate-950 ring-2 ring-cyan-300 font-bold shadow-lg scale-105 z-10';
    if (!pin.isPopulated || pin.signalType === 'RESERVED_NC') {
      return 'bg-slate-950/40 border-dashed border-slate-800 text-slate-600 hover:border-slate-700';
    }
    switch (pin.signalType) {
      case 'POWER_BATT':
      case 'POWER_IGN':
        return 'bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/40';
      case 'GROUND_POWER':
      case 'GROUND_LOGIC':
      case 'SENSOR_GROUND':
        return 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/40';
      case 'SENSOR_5V_REF':
        return 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/40';
      case 'SENSOR_ANALOG_IN':
      case 'SENSOR_DIGITAL_IN':
      case 'SENSOR_VR_IN':
        return 'bg-sky-500/20 border-sky-500/60 text-sky-300 hover:bg-sky-500/40';
      case 'ACTUATOR_LOW_SIDE':
      case 'ACTUATOR_HIGH_SIDE':
        return 'bg-rose-500/20 border-rose-500/60 text-rose-300 hover:bg-rose-500/40';
      case 'CAN_HIGH':
      case 'CAN_LOW':
        return 'bg-purple-500/20 border-purple-500/60 text-purple-300 hover:bg-purple-500/40';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700';
    }
  };

  const displayPins = viewOrientation === 'HARNESS_PLUG'
    ? [...(activeConnector?.pins || [])].reverse()
    : (activeConnector?.pins || []);

  const wireInfo = selectedPin ? parseWireColor(selectedPin.wireColor) : null;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Top ECU Overview Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-b border-slate-800 bg-slate-900/50">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              {vehicle.make} · {vehicle.engineCode} · {vehicle.chassisCode}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-medium">{vehicle.ecuManufacturer} {vehicle.ecuModel}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
            ECU Pinout & Hardware Header Emulator: Part #{vehicle.ecuPartNumber} (HW: {vehicle.hardwareNumber})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Display Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setVisualDisplayMode('HARDWARE_PHOTO')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                visualDisplayMode === 'HARDWARE_PHOTO'
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>ECU Photo Header</span>
            </button>
            <button
              onClick={() => setVisualDisplayMode('PROBE_GUIDE_PHOTO')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                visualDisplayMode === 'PROBE_GUIDE_PHOTO'
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Probe Connection Guide</span>
            </button>
            <button
              onClick={() => setVisualDisplayMode('CAVITY_MATRIX')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                visualDisplayMode === 'CAVITY_MATRIX'
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cavity Grid</span>
            </button>
          </div>

          {/* Provenance badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{vehicle.verifiedStatus} OEM DATA</span>
          </div>

          {/* Orientation switch */}
          <button
            onClick={() =>
              setViewOrientation((prev) => (prev === 'RECEPTACLE' ? 'HARNESS_PLUG' : 'RECEPTACLE'))
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors whitespace-nowrap"
            title="Toggle between ECU metal socket view and wiring harness side view"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              View: {viewOrientation === 'RECEPTACLE' ? 'ECU Metal Socket (Front)' : 'Harness Wire Plug (Mirrored)'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Side: Physical ECU Header Hardware Emulator & Pin Matrix */}
        <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-y-auto tech-grid">
          
          {/* VISUAL DISPLAY MODE 1: PHOTOREALISTIC ECU HARDWARE PHOTO VIEWER */}
          {visualDisplayMode === 'HARDWARE_PHOTO' && (
            <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl mb-6 relative">
              <div className="relative aspect-video w-full bg-slate-950">
                <img
                  src={getEcuPhoto()}
                  alt={`${vehicle.make} ${vehicle.model} ECU Connector Header`}
                  className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                />
                
                {/* Photo Header Overlay Badge */}
                <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700 text-xs font-mono space-y-0.5">
                  <span className="text-cyan-400 font-bold uppercase block">
                    PHOTOREALISTIC HARDWARE CONNECTOR HEADER
                  </span>
                  <span className="text-slate-300 text-[11px] block">
                    {vehicle.ecuManufacturer} {vehicle.ecuModel} · Part #{vehicle.ecuPartNumber}
                  </span>
                </div>

                {/* Active Connector Target Callout Badge on Photo */}
                <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-cyan-500/40 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-cyan-400 animate-spin" />
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">ACTIVE SELECTED CONNECTOR:</span>
                      <span className="text-white font-bold">{activeConnector?.name} ({activeConnector?.receptacleType})</span>
                    </div>
                  </div>

                  {selectedPin && (
                    <div className="bg-cyan-950/60 px-3 py-1.5 rounded border border-cyan-500/40 text-[11px]">
                      <span className="text-cyan-300 font-bold">PROBED PIN #{selectedPin.pinNumber}: </span>
                      <span className="text-white font-semibold">{selectedPin.label} ({selectedPin.wireColor})</span>
                      <span className="text-emerald-400 font-bold ml-2">[{simResult.multimeter.displayString} {simResult.multimeter.unit}]</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Selector Tabs under Photo */}
              <div className="p-4 bg-slate-950 border-t border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                  Select ECU Socket Receptacle Header:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {vehicle.connectors.map((conn) => {
                    const isActive = selectedConnectorId === conn.id;
                    return (
                      <button
                        key={conn.id}
                        onClick={() => setSelectedConnectorId(conn.id)}
                        className={`p-3 rounded-xl border flex flex-col justify-between transition-all text-left ${
                          isActive
                            ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-white">{conn.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="mt-1 text-[10px] font-mono text-slate-400">
                          {conn.pinCount} Pins · {conn.receptacleType}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VISUAL DISPLAY MODE 2: PROBE CONNECTION GUIDE PHOTO & CHECKLIST */}
          {visualDisplayMode === 'PROBE_GUIDE_PHOTO' && (
            <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6 bg-slate-950">
                {/* Macro Probe Photo */}
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 shadow-md">
                  <img
                    src={benchProbeGuideImg}
                    alt="ECU Multimeter Bench Probe Attachment Guide"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded text-[10px] font-mono text-cyan-400 font-bold border border-cyan-500/30">
                    MACRO BENCH PROBE GUIDE
                  </div>
                </div>

                {/* Step-by-Step Bench Wiring Checklist */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-200">BENCH PIN WIRING CONNECTION CHECKLIST</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>1. Power Supply (+12V BATT):</span>
                      </div>
                      <span className="text-amber-300 font-bold">Conn C Pin #1 (+B)</span>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>2. Ignition Switch (IGSW):</span>
                      </div>
                      <span className="text-amber-300 font-bold">Conn C Pin #4 (IGSW)</span>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>3. Chassis Power Ground (GND):</span>
                      </div>
                      <span className="text-emerald-300 font-bold">Conn A Pin #5 (E01)</span>
                    </div>

                    {selectedPin && (
                      <div className="p-2.5 bg-cyan-950/60 rounded-lg border border-cyan-500/50 flex flex-col gap-1">
                        <div className="flex items-center justify-between font-bold text-cyan-300">
                          <span>4. DMM Red Probe (+) Target:</span>
                          <span>{selectedPin.connectorName} Pin #{selectedPin.pinNumber}</span>
                        </div>
                        <div className="text-slate-300 text-[10px] flex items-center justify-between mt-0.5">
                          <span>Target Function: {selectedPin.label} ({selectedPin.wireColor})</span>
                          <span className="text-emerald-400 font-bold">Spec: {selectedPin.nominalVoltageMin}V - {selectedPin.nominalVoltageMax}V</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISUAL DISPLAY MODE 3: CAVITY MATRIX & PHYSICAL ECU HEADER HOUSING */}
          {visualDisplayMode === 'CAVITY_MATRIX' && (
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl mb-6 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between pt-2 pb-3 mb-4 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                    PHYSICAL ECU HEADER RECEPTACLE: {vehicle.ecuManufacturer} {vehicle.ecuModel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                  <span>SERIAL: {vehicle.ecuPartNumber}</span>
                  <span>·</span>
                  <span>HW: {vehicle.hardwareNumber}</span>
                </div>
              </div>

              {/* Connector Selector Tabs */}
              <div className="mb-5 p-3 sm:p-4 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                  Select ECU Header Socket:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {vehicle.connectors.map((conn) => {
                    const isActive = selectedConnectorId === conn.id;
                    return (
                      <button
                        key={conn.id}
                        onClick={() => setSelectedConnectorId(conn.id)}
                        className={`relative p-3 rounded-xl border flex flex-col justify-between transition-all text-left ${
                          isActive
                            ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-white">{conn.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="mt-1 text-[10px] font-mono text-slate-400">
                          {conn.pinCount} Pins · {conn.receptacleType}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pin Cavities Housing View */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 relative">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800 text-[11px] font-mono">
                  <span className="font-bold text-slate-300">
                    {activeConnector?.name} ({activeConnector?.receptacleType}) · Cavity Terminal Grid
                  </span>
                  <span className="text-cyan-400 font-medium">
                    {viewOrientation === 'HARNESS_PLUG' ? 'MIRRORED HARNESS PLUG VIEW' : 'FRONT ECU RECEPTACLE VIEW'}
                  </span>
                </div>

                {/* Pin Buttons Matrix */}
                <div className="flex flex-wrap gap-2 sm:gap-2.5 justify-center py-4 bg-slate-900/60 p-3 sm:p-5 rounded-xl border border-slate-800/80">
                  {displayPins.map((pin) => {
                    const isSelected = selectedPin?.pinNumber === pin.pinNumber;
                    return (
                      <button
                        key={`${pin.connectorId}-${pin.pinNumber}`}
                        onClick={() => onSelectPin(pin.pinNumber)}
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${getPinCircleColor(
                          pin,
                          isSelected
                        )}`}
                        title={`${pin.label} (Pin #${pin.pinNumber}): ${pin.functionDesc}`}
                      >
                        <span className="text-[10px] font-mono font-bold leading-none">
                          {pin.pinNumber}
                        </span>
                        <span className="text-[8px] font-mono tracking-tighter truncate max-w-[36px] leading-tight mt-0.5">
                          {!pin.isPopulated || pin.signalType === 'RESERVED_NC' ? 'NC' : pin.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Connector Completeness Report Card */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-3.5 mb-5 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-bold text-slate-200">
                  CONNECTOR COMPLETENESS REPORT: {activeConnector?.name} ({activeConnector?.receptacleType})
                </span>
              </div>
              <span className="text-emerald-400 font-bold">
                {activeCompleteness.completenessPct}% DOCUMENTED
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-3">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px] uppercase">Total Cavities</span>
                <span className="text-sm font-bold text-slate-200">{activeCompleteness.totalCavities}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px] uppercase">Populated Pins</span>
                <span className="text-sm font-bold text-cyan-400">{activeCompleteness.populatedCount}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px] uppercase">Verified OEM</span>
                <span className="text-sm font-bold text-emerald-400">{activeCompleteness.verifiedCount}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px] uppercase">Unverified</span>
                <span className="text-sm font-bold text-amber-400">{activeCompleteness.unverifiedCount}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[9px] uppercase">Blank Cavities</span>
                <span className="text-sm font-bold text-slate-500">{activeCompleteness.blankCount}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all"
                style={{ width: `${activeCompleteness.completenessPct}%` }}
              />
            </div>
          </div>

          {/* Search & Signal Filter Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 mb-5">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search pin name, function, or pin #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto max-w-full">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'POWER', label: 'Power +12V' },
                { id: 'GROUND', label: 'Grounds' },
                { id: 'SENSOR_5V', label: '5V Ref' },
                { id: 'SENSOR', label: 'Sensors' },
                { id: 'ACTUATOR', label: 'Actuators' },
                { id: 'BUS', label: 'CAN Bus' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSignalFilter(f.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                    signalFilter === f.id
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtered Pins Table */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Connector Pin List ({filteredPins.length} matches)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Click a row to inspect electrical specs & live simulation
              </span>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto">
              {filteredPins.map((pin) => (
                <div
                  key={`row-${pin.connectorId}-${pin.pinNumber}`}
                  onClick={() => onSelectPin(pin.pinNumber)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-xs transition-colors ${
                    selectedPin?.pinNumber === pin.pinNumber && selectedPin?.connectorId === pin.connectorId
                      ? 'bg-cyan-950/40 text-white font-medium border-l-2 border-cyan-400'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 font-mono font-bold text-slate-400">
                      #{pin.pinNumber}
                    </span>
                    <span className="font-mono font-semibold text-cyan-400 min-w-[70px]">
                      {pin.label}
                    </span>
                    <span className="text-slate-300 truncate max-w-[280px]">
                      {pin.functionDesc}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400">{pin.wireColor}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getSignalBadgeColor(
                        pin.signalType
                      )}`}
                    >
                      {pin.signalType.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: High-Accuracy Pin Technical Dossier & Live Interactive Simulation Panel */}
        <div className="w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/90 flex flex-col p-4 sm:p-5 overflow-y-auto max-h-[500px] lg:max-h-none">
          {selectedPin ? (
            <div className="space-y-4">
              {/* Header Title */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                    Pin #{selectedPin.pinNumber} · {selectedPin.connectorName}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                      selectedPin.verificationLevel === 'VERIFIED'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                        : 'bg-amber-950/60 border-amber-500 text-amber-400'
                    }`}
                  >
                    {selectedPin.verificationLevel}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">{selectedPin.label}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {selectedPin.functionDesc}
                </p>
              </div>

              {/* Visual Wire Color Swatch */}
              {wireInfo && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    {/* Visual wire body rendering */}
                    <div className="w-12 h-4 rounded-full border border-slate-700 relative overflow-hidden flex items-center justify-center shadow-inner" style={{ backgroundColor: wireInfo.primary.bg }}>
                      {wireInfo.stripe && (
                        <div className="w-full h-1.5" style={{ backgroundColor: wireInfo.stripe.bg }} />
                      )}
                    </div>
                    <div>
                      <span className="text-slate-200 font-bold">{wireInfo.code}</span>
                      <span className="text-slate-400 block text-[10px]">
                        {wireInfo.primary.name}{wireInfo.stripe ? ` / ${wireInfo.stripe.name} Stripe` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[11px]">{selectedPin.wireGaugeMm2 || 0.5} mm²</span>
                </div>
              )}

              {/* LIVE INTERACTIVE PIN ELECTRICAL SIMULATION & MINI-SCOPE */}
              <div className="bg-slate-950 p-4 rounded-xl border-2 border-cyan-500/40 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="font-mono text-xs font-bold text-white uppercase">
                      Live Electrical Pin Simulation
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                    REAL PHYSICS
                  </span>
                </div>

                {/* Simulation Controls (Power, Key, Fault, Engine sliders) */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <button
                    onClick={() => setSimPowerOn(!simPowerOn)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded border transition-colors ${
                      simPowerOn
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>Supply: {simPowerOn ? '13.8V ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={() => setSimKeyOn(!simKeyOn)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded border transition-colors ${
                      simKeyOn
                        ? 'bg-amber-950 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Key className="w-3 h-3" />
                    <span>Key: {simKeyOn ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Fault Injector Dropdown for this Pin */}
                <div className="text-[11px] font-mono">
                  <span className="text-slate-400 block mb-1">Simulate Pin Electrical Fault:</span>
                  <select
                    value={simFaultType}
                    onChange={(e) => setSimFaultType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono"
                  >
                    <option value="NONE">None (Normal Electrical Operation)</option>
                    <option value="OPEN_CIRCUIT">Open Wire / Cut Harness</option>
                    <option value="SHORT_TO_GND">Short Circuit to Ground (0V)</option>
                    <option value="SHORT_TO_BATT">Short Circuit to Battery (+13.8V)</option>
                    <option value="POOR_GROUND_20_OHM">Corroded Ground (+20Ω Drop)</option>
                  </select>
                </div>

                {/* Engine Parameter Sliders if Analog Sensor */}
                {(selectedPin.label.includes('PCR') || selectedPin.label.includes('FRP') || selectedPin.signalType === 'SENSOR_VR_IN') && (
                  <div className="space-y-1.5 pt-1 text-[11px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Rail Pressure: {simRailBar} Bar</span>
                      <span>RPM: {simRpm}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1800"
                      step="50"
                      value={simRailBar}
                      onChange={(e) => setSimRailBar(Number(e.target.value))}
                      className="w-full accent-cyan-400 h-1 bg-slate-900"
                    />
                  </div>
                )}

                {/* Live Multimeter Readout Card for this Pin */}
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Measured Voltage:</span>
                    <span className="text-lg font-bold text-cyan-400">
                      {simResult.multimeter.displayString} {simResult.multimeter.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-slate-400">Evaluation:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        simResult.multimeter.evaluation === 'PASS'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : simResult.multimeter.evaluation === 'SHORT_CIRCUIT'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500'
                          : simResult.multimeter.evaluation === 'OPEN_CIRCUIT'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {simResult.multimeter.evaluation}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-2 pt-2 border-t border-slate-800/80 leading-relaxed font-sans">
                    {simResult.multimeter.explanation}
                  </p>
                </div>

                {/* Miniature Live Waveform Canvas */}
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-slate-400">
                    <span>LIVE OSCILLOSCOPE TRACE</span>
                    <span>5ms/div</span>
                  </div>
                  <canvas ref={canvasRef} width={280} height={50} className="w-full h-12 rounded bg-slate-950" />
                </div>
              </div>

              {/* Electrical Parameters Table */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-500">Signal Classification</span>
                  <span className="text-cyan-400 font-bold">{selectedPin.signalType}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-500">Wire Spec</span>
                  <span className="text-slate-200">
                    {selectedPin.wireColor} ({selectedPin.wireGaugeMm2 || 0.5} mm²)
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-500">Nominal Voltage Spec</span>
                  <span className="text-emerald-400 font-bold">
                    {selectedPin.nominalVoltageMin}V – {selectedPin.nominalVoltageMax}V
                  </span>
                </div>
                {selectedPin.diodeModeVfMin && (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-500">Diode Mode Drop (Vf)</span>
                    <span className="text-slate-200">
                      {selectedPin.diodeModeVfMin}V – {selectedPin.diodeModeVfMax}V
                    </span>
                  </div>
                )}
                {selectedPin.nominalResistanceMin !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Nominal Resistance</span>
                    <span className="text-slate-200">
                      {selectedPin.nominalResistanceMin}Ω – {selectedPin.nominalResistanceMax}Ω
                    </span>
                  </div>
                )}
              </div>

              {/* Test Instructions */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-300 block mb-0.5">Test Conditions:</span>
                  <p className="text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 leading-relaxed font-mono text-[11px]">
                    {selectedPin.testCondition}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-300 block mb-0.5">Expected Behavior:</span>
                  <p className="text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 leading-relaxed font-mono text-[11px]">
                    {selectedPin.expectedBehavior}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-rose-300 block mb-0.5">Failure Symptom / DTC:</span>
                  <p className="text-rose-200/90 bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/30 leading-relaxed text-[11px]">
                    {selectedPin.failureSymptom}
                  </p>
                </div>
              </div>

              {/* Provenance and Source Citation */}
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
                <span className="font-semibold text-slate-400 block">Documentation Provenance:</span>
                <p className="italic text-slate-400">{selectedPin.verificationSource}</p>
              </div>

              {/* Send To Virtual Bench Button */}
              {onSendToBench && (
                <button
                  onClick={() => onSendToBench(selectedPin.pinNumber)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm mt-4"
                >
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>Connect Multimeter Probe to Pin #{selectedPin.pinNumber}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 my-auto text-slate-500">
              <Layers className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs">Select any pin from the connector grid to inspect verified technical data & live simulation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
