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
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-3 sm:p-6 overflow-y-auto tech-grid">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Component Readings & Tolerances · {vehicle.chassisCode}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
            Bench Measurement Log: {vehicle.make} {vehicle.model} ({vehicle.ecuPartNumber})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Summary Scoreboard */}
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Total: {readings.length}</span>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400 font-bold">PASS: {passCount}</span>
            <span className="text-slate-700">|</span>
            <span className="text-rose-400 font-bold">FAULTS: {faultCount}</span>
          </div>

          <button
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors shadow-sm whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Recommended OEM Bench Test Points Grid */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Standard OEM Bench Test Points (Click to add or probe)
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            Verified tolerance windows from manufacturer documentation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {defaultTestPoints.map((tp, idx) => (
            <div
              key={idx}
              className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-400 font-bold">
                    Pin #{tp.pinNumber}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">
                    {tp.mode.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-white mt-1">{tp.label}</h4>
                <div className="flex items-baseline gap-1 mt-1 text-xs font-mono text-emerald-400 font-bold">
                  <span>Expected: {tp.expectedMin} – {tp.expectedMax} {tp.unit}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{tp.notes}</p>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800/80">
                <button
                  onClick={() => onSelectPinForBench(tp.pinNumber)}
                  className="flex-1 py-1 text-center text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  Probe on Bench
                </button>
                <button
                  onClick={() => handleQuickAddDefault(tp)}
                  className="px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 rounded transition-colors"
                  title="Add reading to log"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Measurements Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col">
        {/* Table Filter Ribbon */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logged readings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto">
            {['ALL', 'PASS', 'FAIL', 'OPEN_CIRCUIT', 'SHORT_CIRCUIT', 'NOT_APPLICABLE'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Pin #</th>
                <th className="px-4 py-3">Label & Function</th>
                <th className="px-4 py-3">Test Mode</th>
                <th className="px-4 py-3 text-right">Measured</th>
                <th className="px-4 py-3 text-right">Expected OEM Spec</th>
                <th className="px-4 py-3 text-center">Evaluation</th>
                <th className="px-4 py-3">Diagnostic Notes</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReadings.map((reading) => (
                <tr key={reading.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{reading.timestamp}</td>
                  <td className="px-4 py-3 font-bold text-cyan-400">#{reading.pinNumber}</td>
                  <td className="px-4 py-3 font-sans font-semibold text-white">{reading.pinLabel}</td>
                  <td className="px-4 py-3 text-slate-400">{reading.measurementType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-100 tabular-nums">
                    {reading.measuredValue} {reading.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 tabular-nums">
                    {reading.expectedMin} – {reading.expectedMax} {reading.unit}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {renderStatusBadge(reading.status)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 truncate max-w-[260px]" title={reading.notes}>
                    {reading.notes}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onDeleteReading(reading.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      title="Delete measurement row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredReadings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No readings logged matching filter. Perform a measurement on the Virtual Bench or click a test point above.
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
