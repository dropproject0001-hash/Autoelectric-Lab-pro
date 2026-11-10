import React, { useState } from 'react';
import { PCBProject } from '../types/pcbScanner';
import { Columns, SplitSquareVertical, AlertTriangle, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface BoardComparisonViewProps {
  currentProject: PCBProject;
  allProjects: PCBProject[];
  onClose: () => void;
}

export const BoardComparisonView: React.FC<BoardComparisonViewProps> = ({
  currentProject,
  allProjects,
  onClose,
}) => {
  const otherProjects = allProjects.filter((p) => p.id !== currentProject.id);
  const [targetProjectId, setTargetProjectId] = useState<string>(otherProjects[0]?.id || currentProject.id);

  const targetProject = allProjects.find((p) => p.id === targetProjectId) || currentProject;

  // Compute component differences between current and target project
  const currentRefDesMap = new Map(currentProject.components.map((c) => [c.refDes, c]));
  const targetRefDesMap = new Map(targetProject.components.map((c) => [c.refDes, c]));

  const diffList: {
    refDes: string;
    type: 'MISSING' | 'ADDED' | 'VALUE_CHANGED' | 'UNCHANGED';
    baseValue?: string;
    targetValue?: string;
    description: string;
  }[] = [];

  // Check base components
  currentProject.components.forEach((c) => {
    const targetComp = targetRefDesMap.get(c.refDes);
    if (!targetComp) {
      diffList.push({
        refDes: c.refDes,
        type: 'MISSING',
        baseValue: c.decodedValue,
        description: `Component ${c.refDes} exists on ${currentProject.name} but is missing on ${targetProject.name}.`,
      });
    } else if (c.decodedValue !== targetComp.decodedValue) {
      diffList.push({
        refDes: c.refDes,
        type: 'VALUE_CHANGED',
        baseValue: c.decodedValue,
        targetValue: targetComp.decodedValue,
        description: `Value difference: Base reads ${c.decodedValue}, Target reads ${targetComp.decodedValue}.`,
      });
    } else {
      diffList.push({
        refDes: c.refDes,
        type: 'UNCHANGED',
        baseValue: c.decodedValue,
        targetValue: targetComp.decodedValue,
        description: 'Identical reference and decoded value.',
      });
    }
  });

  // Check for added components on target
  targetProject.components.forEach((c) => {
    if (!currentRefDesMap.has(c.refDes)) {
      diffList.push({
        refDes: c.refDes,
        type: 'ADDED',
        targetValue: c.decodedValue,
        description: `New component ${c.refDes} added on target revision.`,
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-slate-100 font-sans">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl max-w-5xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ECU Board Comparison & Revision Detector</h3>
              <p className="text-xs text-slate-400 font-mono">
                Compare components, traces, and values between two ECU revisions or damaged vs known-good boards
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Selector Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-400 block mb-1">Base ECU Board (Current):</span>
            <div className="p-2.5 bg-slate-900 rounded border border-cyan-500/40 text-cyan-300 font-bold">
              {currentProject.name} ({currentProject.ecuModel})
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Target ECU Board to Compare Against:</span>
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.ecuModel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Image Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block mb-2 font-bold">BASE BOARD IMAGE ({currentProject.name}):</span>
            <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
              <img src={currentProject.documents[0]?.imageUrl} alt="Base Board" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block mb-2 font-bold">TARGET BOARD IMAGE ({targetProject.name}):</span>
            <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
              <img src={targetProject.documents[0]?.imageUrl} alt="Target Board" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Component Difference Matrix */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
          <span className="text-slate-300 font-bold block mb-2">Detected Component Differences ({diffList.length} items):</span>

          {diffList.map((diff, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border flex items-center justify-between ${
                diff.type === 'MISSING'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : diff.type === 'VALUE_CHANGED'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : diff.type === 'ADDED'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold font-mono text-white min-w-[50px]">{diff.refDes}</span>
                <span className="text-slate-300">{diff.description}</span>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-bold border">
                {diff.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
