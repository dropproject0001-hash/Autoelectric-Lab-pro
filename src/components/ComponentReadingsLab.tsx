import React, { useState } from 'react';
import { VehicleProfile, BenchReading, ConnectorPin, MeasurementEvaluation } from '../types/automotive';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Download, 
  Search,
  SlidersHorizontal,
  RefreshCw,
  ShieldAlert,
  Info
} from 'lucide-react';

interface ComponentReadingsLabProps {
  vehicle: VehicleProfile;
  readings: BenchReading[];
  onAddReading: (reading: BenchReading) => void;
  onDeleteReading: (id: string) => void;
  onExportPdf: () => void;
  onSelectPinForBench: (pinNumber: number) => void;
}

export const ComponentReadingsLab: React.FC<ComponentReadingsLabProps> = ({
  vehicle,
  readings,
  onAddReading,
  onDeleteReading,
  onExportPdf,
  onSelectPinForBench,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Default OEM verified bench test points for this vehicle
  const defaultTestPoints = [
    {
      pinNumber: 1,
      connectorId: 'conn-c',
      label: '+B (Main Power Supply)',
      mode: 'VOLTAGE_DC' as const,
      expectedMin: 11.5,
      expectedMax: 14.5,
      unit: 'V DC',
      notes: 'Key ON / EFI Relay closed. Bench supply 13.8V.',
    },
    {
      pinNumber: 4,
      connectorId: 'conn-c',
      label: 'IGSW (Ignition Wake-Up)',
      mode: 'VOLTAGE_DC' as const,
      expectedMin: 11.5,
      expectedMax: 14.5,
      unit: 'V DC',
      notes: 'Switched 12V terminal 15 signal.',
    },
    {
      pinNumber: 1,
      connectorId: 'conn-b',
      label: 'VC / VCC (5V Sensor Ref)',
      mode: 'VOLTAGE_DC' as const,
      expectedMin: 4.95,
      expectedMax: 5.05,
      unit: 'V DC',
      notes: 'Regulated internal 5V rail for Rail & Boost sensors.',
    },
    {
      pinNumber: 5,
      connectorId: 'conn-a',
      label: 'E01 (Power Ground)',
      mode: 'VOLTAGE_DC' as const,
      expectedMin: 0.0,
      expectedMax: 0.05,
      unit: 'V DC',
      notes: 'Ground offset under full load must be < 50mV.',
    },
    {
      pinNumber: 1,
      connectorId: 'conn-a',
      label: '#10 (INJ #1 Low-Side Diode)',
      mode: 'DIODE' as const,
      expectedMin: 0.50,
      expectedMax: 0.65,
      unit: 'V',
      notes: 'Diode mode to GND. Flyback clamp semiconductor drop.',
    },
    {
      pinNumber: 1,
      connectorId: 'conn-d',
      label: 'CAN-H to CAN-L Bus Terminator',
      mode: 'RESISTANCE' as const,
      expectedMin: 115.0,
      expectedMax: 125.0,
      unit: 'Ω',
      notes: 'Bench isolated ECU internal termination resistor.',
    },
  ];

  const handleQuickAddDefault = (tp: typeof defaultTestPoints[0]) => {
    const nominal = Number(((tp.expectedMin + tp.expectedMax) / 2).toFixed(2));
    const newReading: BenchReading = {
      id: `read-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      pinNumber: tp.pinNumber,
      connectorId: tp.connectorId,
      pinLabel: tp.label,
      measurementType: tp.mode,
      measuredValue: nominal,
      unit: tp.unit,
      expectedMin: tp.expectedMin,
      expectedMax: tp.expectedMax,
      status: 'PASS',
      notes: tp.notes,
      timestamp: new Date().toLocaleTimeString(),
    };
    onAddReading(newReading);
  };

  const filteredReadings = readings.filter((r) => {
    const matchesSearch =
      r.pinLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.pinNumber.toString().includes(searchQuery);

    if (!matchesSearch) return false;
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const passCount = readings.filter((r) => r.status === 'PASS').length;
  const faultCount = readings.filter((r) => r.status !== 'PASS').length;

  const renderStatusBadge = (status: MeasurementEvaluation) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>PASS</span>
          </span>
        );
      case 'OPEN_CIRCUIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span>OPEN CKT</span>
          </span>
        );
      case 'SHORT_CIRCUIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 border border-rose-500 text-rose-300">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>SHORT</span>
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-500/40 text-rose-400">
            <AlertTriangle className="w-3 h-3" />
            <span>FAIL</span>
          </span>
        );
      case 'INVALID_CONNECTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-950/80 border border-orange-500/40 text-orange-400">
            <AlertTriangle className="w-3 h-3" />
            <span>INVALID</span>
          </span>
        );
      case 'UNVERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950/80 border border-yellow-500/40 text-yellow-400">
            <Info className="w-3 h-3" />
            <span>UNVERIFIED</span>
          </span>
        );
      case 'NOT_APPLICABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-400">
            <Info className="w-3 h-3" />
            <span>N/A</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-workstation-bg text-slate-100 p-3 sm:p-6 overflow-y-auto tech-grid font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-workstation-accent shrink-0" />
            <span className="text-xs font-mono text-workstation-accent uppercase tracking-wider">
              Component Readings & Tolerances · {vehicle.chassisCode}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
            Bench Measurement Log: {vehicle.make} {vehicle.model}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Summary Scoreboard */}
          <div className="flex items-center gap-2 text-xs font-mono bg-workstation-panel/80 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-slate-400">Total: {readings.length}</span>
            <span className="text-slate-700">|</span>
            <span className="text-status-success font-bold">PASS: {passCount}</span>
            <span className="text-slate-700">|</span>
            <span className="text-status-error font-bold">FAULTS: {faultCount}</span>
          </div>

          <button
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-workstation-bg bg-workstation-accent hover:bg-workstation-accent-light rounded-xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Recommended OEM Bench Test Points Grid */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-workstation-secondary" />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Standard OEM Bench Test Points
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Manufacturer Verified Tolerances
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {defaultTestPoints.map((tp, idx) => (
            <div
              key={idx}
              className="bg-workstation-panel/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-workstation-accent/30 transition-all hover:shadow-xl group cursor-default"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-workstation-accent font-bold">
                    Pin #{tp.pinNumber}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 px-2 py-0.5 bg-workstation-bg rounded border border-white/5 uppercase">
                    {tp.mode.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-100 mt-2">{tp.label}</h4>
                <div className="flex items-baseline gap-1.5 mt-2 p-2 bg-workstation-bg rounded-lg border border-white/5">
                   <span className="text-[10px] font-mono text-slate-500 uppercase">Expect:</span>
                   <span className="text-xs font-mono text-status-success font-bold">{tp.expectedMin} – {tp.expectedMax} {tp.unit}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed italic">{tp.notes}</p>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                <button
                  onClick={() => onSelectPinForBench(tp.pinNumber)}
                  className="flex-1 py-1.5 text-center text-[11px] font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                >
                  Probe Pin
                </button>
                <button
                  onClick={() => handleQuickAddDefault(tp)}
                  className="px-3 py-1.5 text-xs font-bold text-workstation-secondary hover:bg-workstation-secondary/10 border border-workstation-secondary/30 rounded-lg transition-all"
                  title="Add nominal reading to log"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Measurements Table */}
      <div className="bg-workstation-panel/60 rounded-2xl border border-white/5 overflow-hidden flex-1 flex flex-col shadow-2xl">
        {/* Table Filter Ribbon */}
        <div className="p-4 bg-workstation-panel border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logged readings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-workstation-bg border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-workstation-accent/50 transition-all font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono overflow-x-auto p-1 bg-workstation-bg rounded-xl border border-white/5">
            {['ALL', 'PASS', 'FAIL', 'OPEN_CIRCUIT', 'SHORT_CIRCUIT', 'NOT_APPLICABLE'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg transition-all uppercase font-bold whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-workstation-accent text-workstation-bg shadow-lg'
                    : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
            <thead className="bg-workstation-bg/50 text-slate-500 uppercase text-[9px] tracking-widest sticky top-0 z-10 backdrop-blur-md border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-bold">Time</th>
                <th className="px-6 py-4 font-bold text-center">Pin</th>
                <th className="px-6 py-4 font-bold">Label & Functional Role</th>
                <th className="px-6 py-4 font-bold text-center">Mode</th>
                <th className="px-6 py-4 text-right font-bold">Measured</th>
                <th className="px-6 py-4 text-right font-bold">OEM Range</th>
                <th className="px-6 py-4 text-center font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Engineer Notes</th>
                <th className="px-6 py-4 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredReadings.map((reading) => (
                <tr key={reading.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{reading.timestamp}</td>
                  <td className="px-6 py-4 text-center font-extrabold text-workstation-accent">#{reading.pinNumber}</td>
                  <td className="px-6 py-4 font-sans">
                    <div className="font-bold text-slate-200">{reading.pinLabel}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-white/5 rounded-md border border-white/5 text-[9px] text-slate-500 uppercase font-bold">
                      {reading.measurementType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-100 tabular-nums text-sm">
                    {reading.measuredValue} <span className="text-[10px] text-slate-500 font-normal">{reading.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 tabular-nums">
                    {reading.expectedMin} – {reading.expectedMax} {reading.unit}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {renderStatusBadge(reading.status)}
                  </td>
                  <td className="px-6 py-4 text-slate-400 italic text-[11px] max-w-[200px] truncate" title={reading.notes}>
                    {reading.notes}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onDeleteReading(reading.id)}
                      className="p-2 text-slate-600 hover:text-status-error hover:bg-status-error/10 rounded-lg transition-all"
                      title="Delete measurement record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredReadings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-600 font-sans">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-10 h-10 opacity-20" />
                      <p>No telemetry records found. Initiate measurements on the workbench to populate the log.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

  );
};
