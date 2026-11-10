import React, { useState } from 'react';
import { VEHICLE_DATABASE } from '../data/automotiveDatabase';
import { VehicleProfile } from '../types/automotive';
import { 
  X, 
  Search, 
  Check, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Car,
  ChevronRight
} from 'lucide-react';

interface VehicleSelectorModalProps {
  currentVehicle: VehicleProfile;
  onSelectVehicle: (vehicle: VehicleProfile) => void;
  onClose: () => void;
}

export const VehicleSelectorModal: React.FC<VehicleSelectorModalProps> = ({
  currentVehicle,
  onSelectVehicle,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredVehicles = VEHICLE_DATABASE.filter((v) => {
    return (
      v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.engineCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ecuPartNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ecuManufacturer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-workstation-panel border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] glass-panel">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-workstation-bg text-workstation-accent border border-white/5 shadow-inner">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Vehicle & ECU Platform Selector</h3>
              <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">
                Philippine & Asian Market Verified Systems
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative my-5">
          <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search make, model, engine (1GD, 4JJ1, 4N15), or ECU part..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-workstation-bg border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-workstation-accent/50 transition-all font-mono"
          />
        </div>

        {/* Vehicle List */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {filteredVehicles.map((veh) => {
            const isSelected = currentVehicle.id === veh.id;
            return (
              <div
                key={veh.id}
                onClick={() => {
                  onSelectVehicle(veh);
                  onClose();
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-workstation-accent/10 border-workstation-accent shadow-[0_0_20px_rgba(255,138,0,0.1)]'
                    : 'bg-workstation-bg/40 border-white/5 hover:border-workstation-accent/30 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-workstation-accent uppercase bg-workstation-accent/5 px-1.5 py-0.5 rounded border border-workstation-accent/20">
                        {veh.make} · {veh.productionYears}
                      </span>
                      <span className="text-xs font-mono text-workstation-secondary font-bold">
                        {veh.engineCode}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-100 truncate">{veh.model}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{veh.description}</p>
                  </div>

                  {isSelected && (
                    <div className="p-1.5 rounded-full bg-workstation-accent text-workstation-bg shadow-lg shadow-workstation-accent/20">
                      <Check className="w-3.5 h-3.5 stroke-[4]" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-slate-600" />
                    <span>ECU: </span>
                    <strong className="text-slate-300 uppercase tracking-tighter">{veh.ecuPartNumber}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-slate-600" />
                    <span>Vendor: </span>
                    <strong className="text-slate-300 uppercase">{veh.ecuManufacturer}</strong>
                  </div>
                  <div className="ml-auto">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                      veh.verifiedStatus === 'VERIFIED' 
                        ? 'bg-status-success/10 border-status-success/30 text-status-success' 
                        : 'bg-status-warning/10 border-status-warning/30 text-status-warning'
                    }`}>
                      {veh.verifiedStatus}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredVehicles.length === 0 && (
            <div className="text-center py-12 text-slate-600">
              <p className="text-xs font-mono uppercase tracking-widest">No matching engineering profiles found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-5 mt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-widest">
             ENGINEERING DATABASE: {filteredVehicles.length} STACKS
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>

  );
};
