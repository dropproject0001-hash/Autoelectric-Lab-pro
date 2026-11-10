import React, { useState } from 'react';
import { 
  Zap, 
  Cpu, 
  GitBranch, 
  Layers, 
  SlidersHorizontal, 
  Activity, 
  HelpCircle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  Database,
  History,
  LayoutDashboard
} from 'lucide-react';
import { VehicleProfile } from '../types/automotive';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedVehicle: VehicleProfile;
  onOpenVehicleModal: () => void;
  onOpenReportModal: () => void;
  onOpenTestsModal: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  selectedVehicle,
  onOpenVehicleModal,
  onOpenReportModal,
  onOpenTestsModal,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'workbench', label: 'Bench Lab', icon: Zap },
    { id: 'scanner', label: 'Schematic Scanner', icon: Cpu },
    { id: 'wiring', label: 'Wiring Diagrams', icon: GitBranch },
    { id: 'pinouts', label: 'ECU Pinouts', icon: Layers },
    { id: 'database', label: 'ECU Database', icon: Database },
    { id: 'readings', label: 'Readings Lab', icon: SlidersHorizontal },
    { id: 'dtc', label: 'DTC Diagnostics', icon: Activity },
    { id: 'ai-assistant', label: 'AI Assistant', icon: HelpCircle },
    { id: 'reports', label: 'Reports & History', icon: History },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-screen bg-workstation-bg overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col bg-workstation-panel border-r border-white/5 transition-all duration-300 z-40 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <div className="w-8 h-8 rounded bg-workstation-accent flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-workstation-bg fill-current" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-white truncate">
                  AutoElectric Lab
                </span>
                <span className="text-[10px] font-mono text-workstation-accent uppercase -mt-0.5 tracking-wider">
                  RAMT PRO
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative ${
                  isActive 
                    ? 'bg-workstation-accent/10 text-workstation-accent' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-workstation-accent' : 'group-hover:text-white'}`} />
                {!isSidebarCollapsed && (
                  <span className="text-xs font-semibold tracking-wide">
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-workstation-accent rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-white/5 space-y-1">
          <button 
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all ${
              activeTab === 'settings' ? 'text-workstation-accent bg-workstation-accent/10' : ''
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!isSidebarCollapsed && <span className="text-xs font-semibold">System Settings</span>}
          </button>
          
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-100 hover:bg-white/5 transition-all"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!isSidebarCollapsed && <span className="text-xs font-semibold uppercase tracking-widest opacity-60">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header / Toolbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 bg-workstation-panel/30 border-b border-white/5 shrink-0 backdrop-blur-md z-30">
          <div className="flex items-center gap-4 lg:gap-0">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden lg:flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-mono text-slate-500 uppercase tracking-[0.2em]">
                  {navItems.find(i => i.id === activeTab)?.label || 'Engineering Station'}
                </h1>
                <span className="text-[10px] font-mono text-slate-700">|</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  Workstation Online · 12.8ms Latency · CPU 4%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Project/Vehicle Quick Selector */}
            <button 
              onClick={onOpenVehicleModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-workstation-bg border border-white/5 hover:border-workstation-accent/50 transition-all text-left group"
            >
              <Database className="w-3.5 h-3.5 text-workstation-accent" />
              <div className="flex flex-col pr-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase leading-none group-hover:text-workstation-accent transition-colors">
                  Active Platform
                </span>
                <span className="text-xs font-bold text-slate-200 truncate max-w-[120px] sm:max-w-[200px]">
                  {selectedVehicle.make} {selectedVehicle.model}
                </span>
              </div>
            </button>

            <div className="hidden md:flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
              <button 
                onClick={onOpenReportModal}
                className="p-2 text-slate-400 hover:text-workstation-accent transition-colors"
                title="Engineering Reports"
              >
                <History className="w-5 h-5" />
              </button>
              <button 
                className="w-8 h-8 rounded-full bg-workstation-panel border border-white/10 flex items-center justify-center text-[10px] font-bold text-workstation-accent"
              >
                RL
              </button>
            </div>
          </div>
        </header>

        {/* Workspace Slot */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <nav className="relative w-72 bg-workstation-panel h-full flex flex-col border-r border-white/10 shadow-2xl">
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
              <span className="font-bold text-white tracking-tight">Navigation</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-workstation-accent text-workstation-bg font-bold' 
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
};
