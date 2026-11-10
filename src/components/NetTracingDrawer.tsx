import React from 'react';
import { ElectricalNet, DetectedComponent } from '../types/pcbScanner';
import { Activity, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, X } from 'lucide-react';

interface NetTracingDrawerProps {
  nets: ElectricalNet[];
  components: DetectedComponent[];
  selectedNetId: string | null;
  onSelectNet: (netId: string) => void;
  onClose: () => void;
}

export const NetTracingDrawer: React.FC<NetTracingDrawerProps> = ({
  nets,
  components,
  selectedNetId,
  onSelectNet,
  onClose,
}) => {
  const activeNet = nets.find((n) => n.id === selectedNetId) || nets[0];

  const connectedComponents = activeNet
    ? components.filter((c) => activeNet.connectedComponentIds.includes(c.id))
    : [];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-4 shadow-2xl font-sans text-slate-100">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white uppercase">Circuit Net Path Tracer</span>
          {activeNet && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              {activeNet.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {activeNet && (
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                activeNet.isComplete
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-950 text-amber-300 border-amber-500/40'
              }`}
            >
              {activeNet.isComplete ? 'VERIFIED COMPLETE PATH' : 'CONNECTION PATH INCOMPLETE'}
            </span>
          )}

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Net Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto my-3 pb-1">
        {nets.map((net) => (
          <button
            key={net.id}
            onClick={() => onSelectNet(net.id)}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap ${
              activeNet?.id === net.id
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 font-bold shadow'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {net.name}
          </button>
        ))}
      </div>

      {/* Established Circuit Path Visualizer */}
      {activeNet && (
        <div className="space-y-3 font-mono text-xs">
          {!activeNet.isComplete && (
            <div className="p-3 bg-amber-950/50 border border-amber-500/40 rounded-xl text-amber-200 flex items-center gap-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>UNVERIFIED SEGMENT DETECTED:</strong> Internal PCB copper layers, buried vias, or hidden traces cannot be guaranteed without layer documentation.
              </span>
            </div>
          )}

          {/* Connected Component Chain */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
            {connectedComponents.map((comp, idx) => (
              <React.Fragment key={comp.id}>
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                  <span className="font-bold text-cyan-400">{comp.refDes}</span>
                  <span className="text-slate-300 text-[11px]">({comp.decodedValue})</span>
                </div>
                {idx < connectedComponents.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
