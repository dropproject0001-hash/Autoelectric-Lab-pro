import React from 'react';
import { PcbComponentThermal, VehicleProfile } from '../types/automotive';
import { 
  X, 
  Thermometer, 
  Zap, 
  ShieldCheck, 
  ExternalLink, 
  FileText, 
  Activity, 
  TrendingUp,
  Cpu
} from 'lucide-react';

interface ThermalProfilingModalProps {
  component: PcbComponentThermal;
  vehicle: VehicleProfile;
  onClose: () => void;
}

export const ThermalProfilingModal: React.FC<ThermalProfilingModalProps> = ({
  component,
  vehicle,
  onClose,
}) => {
  // Generate simulated power dissipation history across operating states
  const history = [
    { state: 'Key ON (Engine Off)', temp: component.currentTemp - 15, power: component.currentPowerDissipation * 0.4 },
    { state: 'Idle (750 RPM)', temp: component.currentTemp - 8, power: component.currentPowerDissipation * 0.7 },
    { state: 'Cruise (2000 RPM)', temp: component.currentTemp, power: component.currentPowerDissipation },
    { state: 'Full Load (Peak Boost)', temp: component.currentTemp + 12, power: component.currentPowerDissipation * 1.35 },
  ];

  const isCritical = component.currentTemp >= component.maxSafeTemp * 0.8;
  const tempMargin = component.maxSafeTemp - component.currentTemp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-workstation-panel border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] glass-panel font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-workstation-bg text-workstation-accent border border-white/5 shadow-inner">
              <Thermometer className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-workstation-accent/20 text-workstation-accent border border-workstation-accent/30">
                  {component.designation}
                </span>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  {vehicle.ecuManufacturer} {vehicle.ecuModel}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">
                {component.partNumber} Thermal Profiling Report
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-6 py-5 overflow-y-auto flex-1 text-xs custom-scrollbar">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-workstation-bg p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Current Temp</span>
              <span className={`text-xl font-mono font-bold mt-1 ${isCritical ? 'text-rose-500' : 'text-amber-400'}`}>
                {component.currentTemp}°C
              </span>
            </div>

            <div className="bg-workstation-bg p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Max Safe Limit</span>
              <span className="text-xl font-mono font-bold text-slate-200 mt-1">
                {component.maxSafeTemp}°C
              </span>
            </div>

            <div className="bg-workstation-bg p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Thermal Margin</span>
              <span className="text-xl font-mono font-bold text-emerald-400 mt-1">
                +{tempMargin}°C
              </span>
            </div>

            <div className="bg-workstation-bg p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Dissipation</span>
              <span className="text-xl font-mono font-bold text-cyan-400 mt-1">
                {component.currentPowerDissipation} W
              </span>
            </div>
          </div>

          {/* Component Role & Specifications */}
          <div className="bg-workstation-bg/50 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-workstation-secondary" />
              <span>Component Functional Role & Architecture</span>
            </div>
            <p className="text-slate-300 font-mono text-xs leading-relaxed">
              {component.functionRole}. This semiconductor package is thermally coupled to the internal PCB copper ground plane to dissipate operational thermal loads under high-frequency switching.
            </p>
          </div>

          {/* Power Dissipation History across Operating States */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-workstation-accent" />
                Power Dissipation & Thermal History
              </span>
              <span className="text-[10px] font-mono text-slate-500">Simulated Bench Telemetry</span>
            </div>

            <div className="space-y-2 font-mono">
              {history.map((h, i) => (
                <div key={i} className="p-3 bg-workstation-bg rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-bold w-6">#{i+1}</span>
                    <span className="text-slate-200 text-xs font-semibold">{h.state}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Dissipation</span>
                      <span className="text-cyan-400 font-bold text-xs">{h.power.toFixed(2)} W</span>
                    </div>
                    <div className="text-right w-16">
                      <span className="text-[10px] text-slate-500 block">Temp</span>
                      <span className={`font-bold text-xs ${h.temp > 75 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {h.temp.toFixed(1)}°C
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Part Specification & Datasheet Links */}
          <div className="space-y-3 pt-2">
            <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Authorized Specifications & Datasheet References
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
              <a 
                href={`https://www.google.com/search?q=${encodeURIComponent(component.partNumber + ' datasheet semiconductor')}`}
                target="_blank" 
                rel="noreferrer"
                className="p-3 bg-workstation-bg hover:bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-4 h-4 text-workstation-accent shrink-0" />
                  <span className="text-slate-200 font-semibold truncate">Manufacturer Datasheet</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0" />
              </a>

              <a 
                href={`https://www.google.com/search?q=${encodeURIComponent(component.partNumber + ' thermal application note')}`}
                target="_blank" 
                rel="noreferrer"
                className="p-3 bg-workstation-bg hover:bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200 font-semibold truncate">Thermal Application Note</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0" />
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/5">
          <span className="text-[10px] font-mono text-slate-500 uppercase">
            RAMT Engineering · Thermal Analysis Module v2.4
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-workstation-bg bg-workstation-accent hover:bg-workstation-accent-light rounded-xl transition-all shadow-lg"
          >
            CLOSE REPORT
          </button>
        </div>
      </div>
    </div>
  );
};
