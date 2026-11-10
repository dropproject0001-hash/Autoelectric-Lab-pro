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
    <div className="flex flex-col h-full bg-workstation-bg text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 border-b border-white/5 bg-workstation-panel/60">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-workstation-accent shrink-0" />
            <span className="text-xs font-mono text-workstation-accent uppercase tracking-wider">
              Diagnostic Trouble Code & Hardware Faults
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
            ECU Hardware DTC Knowledgebase
          </h2>
        </div>
        <span className="hidden sm:inline-block text-xs font-mono text-slate-500">
          Tailored for Common Rail Diesel & High-Speed CAN platforms
        </span>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left Side: Search & Code List */}
        <div className="w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-white/5 bg-workstation-panel/40 flex flex-col p-3 sm:p-4 max-h-[260px] md:max-h-none">
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search DTC code (e.g., P0641, U0100)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-workstation-bg border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-workstation-accent/50 font-mono"
            />
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {filteredDtcList.map((dtc) => {
              const isSelected = selectedDtc.code === dtc.code;
              return (
                <div
                  key={dtc.code}
                  onClick={() => setSelectedDtcCode(dtc.code)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white/5 border-workstation-accent/50 shadow-lg'
                      : 'bg-workstation-bg/70 border-white/5 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-bold text-workstation-accent">
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
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
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
              <div className="bg-workstation-panel/90 border-2 border-white/5 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <ShieldAlert className="w-24 h-24 text-workstation-accent" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-mono font-extrabold text-workstation-accent tracking-wider">
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
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-2xl">
                    {selectedDtc.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-5 text-xs font-mono bg-workstation-bg p-3 rounded-xl border border-white/5">
                    <div>
                      <span className="text-slate-500 block text-[11px] uppercase tracking-wider mb-0.5">ECU Architecture</span>
                      <span className="text-slate-200 font-bold">{selectedDtc.ecuFamily}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px] uppercase tracking-wider mb-0.5">Pin Reference</span>
                      <span className="text-workstation-secondary font-bold">{selectedDtc.pinReference}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Bench Testing Flowchart */}
              <div className="bg-workstation-panel/90 border border-white/5 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Zap className="w-4 h-4 text-workstation-accent" />
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Step-by-Step Bench Testing Procedure
                  </h4>
                </div>

                <div className="p-4 bg-workstation-bg rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed font-mono">
                  {selectedDtc.benchTestStep}
                </div>

                {selectedDtc.pinReference && (
                  <button
                    onClick={() => {
                      const match = selectedDtc.pinReference?.match(/Pin\s*(\d+)/i) || selectedDtc.pinReference?.match(/Pin\s*([A-Za-z]\d+)/i);
                      onSelectPinForBench(1);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-workstation-bg bg-workstation-accent hover:bg-workstation-accent-light rounded-xl transition-all shadow-lg active:scale-[0.98]"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Launch Virtual Bench Probe Test for this Pin</span>
                  </button>
                )}
              </div>

              {/* Possible Root Causes List */}
              <div className="bg-workstation-panel/90 border border-white/5 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <ShieldAlert className="w-4 h-4 text-status-warning" />
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Possible Failure Root Causes
                  </h4>
                </div>

                <ul className="space-y-2 text-xs">
                  {selectedDtc.possibleCauses.map((cause, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-workstation-bg rounded-xl border border-white/5"
                    >
                      <span className="w-6 h-6 rounded-lg bg-white/5 text-workstation-accent font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-white/5">
                        {idx + 1}
                      </span>
                      <span className="text-slate-300 leading-relaxed pt-0.5">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* PCB Component Repair Guide Cross-Reference */}
              <div className="bg-workstation-panel/90 border border-white/5 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Cpu className="w-4 h-4 text-workstation-secondary" />
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Associated PCB IC & Component Reference
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PCB_COMPONENT_LIBRARY.slice(0, 2).map((comp) => (
                    <div
                      key={comp.id}
                      className="p-4 bg-workstation-bg rounded-xl border border-white/5 text-xs space-y-2 hover:border-workstation-secondary/30 transition-colors cursor-default"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-workstation-secondary text-sm">
                          {comp.designation}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{comp.package}</span>
                      </div>
                      <div className="text-slate-200 font-semibold">{comp.partNumber}</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{comp.functionRole}</p>
                      <div className="pt-2 border-t border-white/5">
                         <p className="text-[11px] text-slate-300 italic">
                          {comp.commonFailure}
                        </p>
                      </div>
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
