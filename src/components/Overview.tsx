import React from 'react';
import { 
  Zap, 
  Cpu, 
  GitBranch, 
  Layers, 
  Activity, 
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { VehicleProfile, BenchReading } from '../types/automotive';

import { CircuitThermalHeatmap } from './CircuitThermalHeatmap';

interface OverviewProps {
  vehicle: VehicleProfile;
  readings: BenchReading[];
  onNavigate: (tab: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ vehicle, readings, onNavigate }) => {
  const tools = [
    { id: 'workbench', label: 'Virtual Test Bench', icon: Zap, color: 'text-workstation-accent', desc: 'Real-time electrical simulation & DMM' },
    { id: 'scanner', label: 'AI Schematic Scanner', icon: Cpu, color: 'text-workstation-secondary', desc: 'PCB intelligence & component analysis' },
    { id: 'wiring', label: 'Wiring Diagrams', icon: GitBranch, color: 'text-emerald-400', desc: 'Interactive system-level schematics' },
    { id: 'pinouts', label: 'ECU Pinout Explorer', icon: Layers, color: 'text-blue-400', desc: 'Detailed connector cavity documentation' },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-8 space-y-8 tech-grid">
      {/* Welcome & Active Project Card */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-64 h-64 text-workstation-accent" />
          </div>
          <div className="relative z-10">
            <span className="text-xs font-mono text-workstation-accent uppercase tracking-widest">
              Project Baseline · Active Session
            </span>
            <h2 className="text-3xl font-bold text-white mt-2">
              {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
              Engineered diagnostic session for the {vehicle.ecuManufacturer} {vehicle.ecuModel} platform. 
              All electrical nodes are synced with the live simulation engine.
            </p>
            
            <div className="flex flex-wrap gap-4 mt-8">
              <button 
                onClick={() => onNavigate('workbench')}
                className="flex items-center gap-2 px-6 py-2.5 bg-workstation-accent text-workstation-bg font-bold rounded-lg hover:bg-workstation-accent-light transition-all"
              >
                <span>Launch Test Bench</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-6 px-6 py-2.5 rounded-lg border border-white/5 bg-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Engine Code</span>
                  <span className="text-xs font-bold text-slate-200">{vehicle.engineCode}</span>
                </div>
                <div className="flex flex-col border-l border-white/10 pl-6">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Software Rev</span>
                  <span className="text-xs font-bold text-slate-200">{vehicle.softwareNumber || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status Block */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
              Workstation Telemetry
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Cloud AI Core', status: 'Optimal', color: 'text-status-success', val: '24ms' },
                { label: 'Local Database', status: 'Synced', color: 'text-status-success', val: '124k Rec' },
                { label: 'Physics Engine', status: 'Calibrated', color: 'text-status-success', val: '60Hz' },
                { label: 'Security Module', status: 'Encrypted', color: 'text-status-info', val: 'AES-256' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-slate-400">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-600 uppercase">{item.val}</span>
                    <span className={`font-mono font-bold ${item.color}`}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-status-success" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Authenticated · Engineer Level 4
            </span>
          </div>
        </div>
      </section>

      {/* Engineering Tools Grid */}
      <section className="space-y-4">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest px-2">
          Engineering Workspaces
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => onNavigate(tool.id)}
                className="glass-panel p-5 rounded-2xl text-left hover:border-workstation-accent/30 group transition-all"
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 transition-all group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${tool.color}`} />
                </div>
                <h4 className="font-bold text-white text-sm group-hover:text-workstation-accent transition-colors">
                  {tool.label}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Thermal Heatmap Section */}
      {vehicle.thermalComponents && vehicle.thermalComponents.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <CircuitThermalHeatmap vehicle={vehicle} components={vehicle.thermalComponents} />
        </section>
      )}

      {/* Recent Activity & Quick Metrics */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        {/* Recent Readings */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Activity className="w-4 h-4 text-workstation-accent" />
              Recent Measurement Logs
            </div>
            <button 
              onClick={() => onNavigate('readings')}
              className="text-[10px] font-mono text-workstation-accent hover:underline"
            >
              View Full Lab
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {readings.length > 0 ? (
              <div className="divide-y divide-white/5">
                {readings.slice(0, 5).map((read) => (
                  <div key={read.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">{read.pinLabel}</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{read.measurementType.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-mono font-bold ${read.status === 'PASS' ? 'text-status-success' : 'text-status-error'}`}>
                          {read.measuredValue} {read.unit}
                        </span>
                        <span className="text-[9px] font-mono text-slate-600">{read.timestamp}</span>
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full ${read.status === 'PASS' ? 'bg-status-success' : 'bg-status-error'}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-600 text-xs italic">
                No active bench readings recorded in this session.
              </div>
            )}
          </div>
        </div>

        {/* System Notifications/History */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-white/5 text-xs font-bold text-white uppercase tracking-wider">
            <Clock className="w-4 h-4 text-workstation-secondary" />
            Session Timeline
          </div>
          <div className="p-4 space-y-4">
            {[
              { time: '14:20', event: 'Physics Engine re-calibrated for high-voltage pulse test.', type: 'info' },
              { time: '14:15', event: 'New schematic page "Injector Control" successfully scanned.', type: 'success' },
              { time: '14:02', event: 'Voltage threshold warning triggered on Pin #40.', type: 'warning' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 group">
                <span className="text-[10px] font-mono text-slate-600 group-hover:text-workstation-accent transition-colors pt-0.5">{item.time}</span>
                <p className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed">
                  {item.event}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
