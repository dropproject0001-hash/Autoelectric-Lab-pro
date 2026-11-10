import React from 'react';
import { 
  Cpu, 
  FileText, 
  Activity, 
  GitBranch, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  Zap,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { VehicleProfile } from '../types/automotive';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedVehicle: VehicleProfile;
  onOpenVehicleModal: () => void;
  onOpenReportModal: () => void;
  onOpenTestsModal: () => void;
  systemPowerOn: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedVehicle,
  onOpenVehicleModal,
  onOpenReportModal,
  onOpenTestsModal,
  systemPowerOn,
}) => {
  const navItems = [
    { id: 'workbench', label: 'Bench Lab', icon: Zap },
    { id: 'scanner', label: 'Schematic Scanner', icon: Cpu },
    { id: 'wiring', label: 'Wiring Diagrams', icon: GitBranch },
    { id: 'pinouts', label: 'ECU Pinouts', icon: Layers },
    { id: 'readings', label: 'Component Readings', icon: SlidersHorizontal },
    { id: 'dtc', label: 'DTC Diagnostics', icon: Activity },
    { id: 'ai-assistant', label: 'AI Assistant', icon: HelpCircle },
  ];

  return (
    <div className="flex flex-col shrink-0 select-none border-b border-slate-800 bg-slate-900 z-30">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-8 px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 shrink-0">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap truncate">
              AutoElectric Lab Pro
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono tracking-wider text-slate-400 uppercase -mt-0.5 truncate">
              RAMT Engineering Suite
            </span>
          </div>
        </div>

        {/* Zone 2: Desktop Navigation Links (Visible on lg and larger) */}
        <nav className="hidden lg:flex items-center gap-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Active Vehicle & Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Vehicle Quick Switcher Button */}
          <button
            onClick={onOpenVehicleModal}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-mono bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-md text-slate-200 transition-colors whitespace-nowrap max-w-[130px] sm:max-w-[200px] md:max-w-[260px] truncate"
            title="Click to change active vehicle and ECU platform"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">
              {selectedVehicle.make} {selectedVehicle.model}
            </span>
          </button>

          {/* Bench Self-Test Suite Button */}
          <button
            onClick={onOpenTestsModal}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors whitespace-nowrap shrink-0"
            title="Inspect and run automated test suite for calculations and wiring"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Suite</span>
          </button>

          {/* Primary Action CTA: Export Bench Report */}
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar (< lg screens): Scrollable tabs for all modules */}
      <nav className="flex lg:hidden items-center gap-1.5 px-2.5 py-1.5 overflow-x-auto bg-slate-950/90 border-t border-slate-800/80 scrollbar-none text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </button>
          );
        })}
        {/* Quick Test Suite button on mobile nav */}
        <button
          onClick={onOpenTestsModal}
          className="flex md:hidden items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 rounded-md whitespace-nowrap shrink-0"
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Tests</span>
        </button>
      </nav>
    </div>
  );
};
