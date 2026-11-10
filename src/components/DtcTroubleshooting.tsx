import React, { useState } from 'react';
import { DTC_DATABASE, PCB_COMPONENT_LIBRARY } from '../data/automotiveDatabase';
import { DTCRecord, VehicleProfile } from '../types/automotive';
import { 
  Activity, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Cpu, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

interface DtcTroubleshootingProps {
  vehicle: VehicleProfile;
  onSelectPinForBench: (pinNumber: number) => void;
}

export const DtcTroubleshooting: React.FC<DtcTroubleshootingProps> = ({
  vehicle,
  onSelectPinForBench,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDtcCode, setSelectedDtcCode] = useState<string>(DTC_DATABASE[0].code);

  const filteredDtcList = DTC_DATABASE.filter((dtc) => {
    return (
      dtc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dtc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dtc.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const selectedDtc =
    DTC_DATABASE.find((d) => d.code === selectedDtcCode) || DTC_DATABASE[0];

  const getSeverityBadge = (severity: DTCRecord['severity']) => {
    switch (severity) {
      case 'CRITICAL_NO_START':
        return 'bg-rose-950/60 border-rose-500/60 text-rose-400';
      case 'LIMP_MODE':
        return 'bg-amber-950/60 border-amber-500/60 text-amber-400';
      default:
        return 'bg-yellow-950/60 border-yellow-500/60 text-yellow-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 border-b border-slate-800 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Diagnostic Trouble Code & Hardware Faults
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
            ECU Hardware DTC Knowledgebase
          </h2>
        </div>
        <span className="hidden sm:inline-block text-xs font-mono text-slate-400">
          Tailored for Common Rail Diesel & High-Speed CAN platforms
        </span>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left Side: Search & Code List */}
        <div className="w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 flex flex-col p-3 sm:p-4 max-h-[260px] md:max-h-none">
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search DTC code (e.g., P0641, U0100)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {filteredDtcList.map((dtc) => {
              const isSelected = selectedDtc.code === dtc.code;
              return (
                <div
                  key={dtc.code}
                  onClick={() => setSelectedDtcCode(dtc.code)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500/50 shadow-md'
                      : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-bold text-cyan-400">
                      {dtc.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border ${getSeverityBadge(
                        dtc.severity
                      )}`}
                    >
                      {dtc.severity.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {dtc.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {dtc.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed OEM Diagnostic Dossier */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto tech-grid space-y-4 sm:space-y-6">
          {selectedDtc && (
            <>
              {/* DTC Header Card */}
              <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-extrabold text-cyan-400 tracking-wider">
                    {selectedDtc.code}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-mono font-bold rounded border ${getSeverityBadge(
                      selectedDtc.severity
                    )}`}
                  >
                    {selectedDtc.severity.replace(/_/g, ' ')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mt-2">{selectedDtc.title}</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {selectedDtc.description}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[11px]">ECU Architecture</span>
                    <span className="text-slate-200 font-bold">{selectedDtc.ecuFamily}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Pin Reference</span>
                    <span className="text-emerald-400 font-bold">{selectedDtc.pinReference}</span>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Bench Testing Flowchart */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Step-by-Step Bench Testing Procedure
                  </h4>
                </div>

                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono">
                  {selectedDtc.benchTestStep}
                </div>

                {selectedDtc.pinReference && (
                  <button
                    onClick={() => {
                      const match = selectedDtc.pinReference?.match(/Pin\s*(\d+)/i) || selectedDtc.pinReference?.match(/Pin\s*([A-Za-z]\d+)/i);
                      // default to pin 1
                      onSelectPinForBench(1);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Launch Virtual Bench Probe Test for this Pin</span>
                  </button>
                )}
              </div>

              {/* Possible Root Causes List */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Possible Failure Root Causes
                  </h4>
                </div>

                <ul className="space-y-2 text-xs">
                  {selectedDtc.possibleCauses.map((cause, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 p-2 bg-slate-950 rounded-lg border border-slate-800/80"
                    >
                      <span className="w-5 h-5 rounded bg-slate-800 text-cyan-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-300 leading-relaxed">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* PCB Component Repair Guide Cross-Reference */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Associated PCB IC & Component Reference
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PCB_COMPONENT_LIBRARY.slice(0, 2).map((comp) => (
                    <div
                      key={comp.id}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-purple-300">
                          {comp.designation} · {comp.partNumber}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{comp.package}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{comp.functionRole}</p>
                      <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800">
                        {comp.commonFailure}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
