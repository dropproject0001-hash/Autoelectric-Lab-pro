import React, { useState } from 'react';
import { DetectedComponent, ReadoutClassification, VerificationStatus } from '../types/pcbScanner';
import { 
  Cpu, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  Sliders, 
  X, 
  Info,
  CheckCircle2,
  Power,
  RotateCcw,
  ExternalLink
} from 'lucide-react';

interface FloatingComponentHudProps {
  component: DetectedComponent | null;
  onClose: () => void;
  onSendToBench?: (comp: DetectedComponent) => void;
  onInjectFault?: (comp: DetectedComponent, faultType: string) => void;
  simulatedVoltage?: number | null;
  readoutType?: ReadoutClassification;
}

export const FloatingComponentHud: React.FC<FloatingComponentHudProps> = ({
  component,
  onClose,
  onSendToBench,
  onInjectFault,
  simulatedVoltage = 5.0,
  readoutType = 'SIMULATED',
}) => {
  const [selectedFault, setSelectedFault] = useState<string>('NONE');

  if (!component) return null;

  const renderVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" />
            <span>OEM VERIFIED</span>
          </span>
        );
      case 'CROSS_REFERENCED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-mono font-bold text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/40">
            <Info className="w-3 h-3" />
            <span>CROSS-REFERENCED</span>
          </span>
        );
      case 'UNVERIFIED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-950 text-amber-400 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3" />
            <span>UNVERIFIED</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed top-20 right-4 z-40 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md border-2 border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100 font-sans">
      {/* HUD Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs shrink-0">
            {component.refDes}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase">{component.refDes}</span>
              {renderVerificationBadge(component.verificationStatus)}
            </div>
            <span className="text-[11px] font-mono text-slate-400">{component.category.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* HUD Scrollable Body */}
      <div className="p-4 overflow-y-auto space-y-4 text-xs">
        {/* Readout Classification Badge & Voltage Readout */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">READOUT CLASSIFICATION:</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/40">
              {readoutType}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">Terminal Voltage:</span>
            <span className="text-lg font-bold text-cyan-400">
              {simulatedVoltage !== null ? `${simulatedVoltage.toFixed(3)} V DC` : '---'}
            </span>
          </div>
        </div>

        {/* Specifications Table */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono space-y-2.5 text-[11px]">
          <div className="flex justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-500">Visible Marking:</span>
            <span className="text-slate-200 font-bold">{component.marking || 'N/A'}</span>
          </div>
          <div className="flex justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-500">Decoded Value:</span>
            <span className="text-cyan-400 font-bold">{component.decodedValue}</span>
          </div>
          <div className="flex justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-500">Package Style:</span>
            <span className="text-slate-300">{component.packageType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">AI Confidence:</span>
            <span className="text-emerald-400 font-bold">{Math.round(component.confidenceScore * 100)}%</span>
          </div>
        </div>

        {/* Circuit Function */}
        <div>
          <span className="font-semibold text-slate-300 block mb-1 font-mono text-[11px]">Circuit Function:</span>
          <p className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 leading-relaxed font-sans">
            {component.circuitFunction}
          </p>
        </div>

        {/* Diagnostic Failure Symptoms */}
        {component.failureSymptom && (
          <div>
            <span className="font-semibold text-rose-300 block mb-1 font-mono text-[11px]">Failure Symptom / DTC:</span>
            <p className="p-2.5 bg-rose-950/30 rounded-lg border border-rose-500/40 text-rose-200 leading-relaxed font-sans">
              {component.failureSymptom}
            </p>
          </div>
        )}

        {/* Virtual Fault Injection */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
          <span className="text-slate-300 font-bold block">Inject Virtual Component Fault:</span>
          <select
            value={selectedFault}
            onChange={(e) => {
              setSelectedFault(e.target.value);
              if (onInjectFault) onInjectFault(component, e.target.value);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-400"
          >
            <option value="NONE">None (Normal Operation)</option>
            <option value="OPEN_CIRCUIT">Open Circuit (Blown Element)</option>
            <option value="SHORT_TO_GND">Short Circuit to Ground (0V)</option>
            <option value="SHORT_TO_BATT">Short Circuit to Battery (+13.8V)</option>
          </select>
        </div>

        {/* Actions Bar */}
        {onSendToBench && (
          <button
            onClick={() => onSendToBench(component)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors shadow-md font-mono"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>Connect DMM Probe to {component.refDes}</span>
          </button>
        )}
      </div>
    </div>
  );
};
