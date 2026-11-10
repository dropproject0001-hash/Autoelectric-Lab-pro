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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Select Vehicle & ECU Platform</h3>
              <p className="text-xs text-slate-400 font-mono">
                Verified engine management systems for Philippine & Asian markets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative my-4">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search make, model, engine code (1GD, 4JJ1, 4N15, YD25), or ECU part #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Vehicle List */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {filteredVehicles.map((veh) => {
            const isSelected = currentVehicle.id === veh.id;
            return (
              <div
                key={veh.id}
                onClick={() => {
                  onSelectVehicle(veh);
                  onClose();
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400 uppercase">
                        {veh.make} · {veh.productionYears}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs font-mono text-emerald-400 font-semibold">
                        {veh.engineCode}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white mt-0.5">{veh.model}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{veh.description}</p>
                  </div>

                  {isSelected && (
                    <div className="p-1 rounded-full bg-cyan-400 text-slate-950">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                  <div>
                    <span className="text-slate-500">ECU Part: </span>
                    <strong className="text-slate-200">{veh.ecuPartNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Vendor: </span>
                    <strong className="text-slate-200">{veh.ecuManufacturer} {veh.ecuModel.split(' ')[0]}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Sockets: </span>
                    <strong className="text-slate-200">{veh.socketCount} Connectors</strong>
                  </div>
                  <div className="ml-auto">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold">
                      {veh.verifiedStatus}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>{filteredVehicles.length} Platforms Available</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
