import React, { useState } from 'react';
import { DetectedComponent, VerificationStatus } from '../types/pcbScanner';
import { CheckCircle2, ShieldCheck, X, FileText, History } from 'lucide-react';

interface PcbManualCorrectionModalProps {
  component: DetectedComponent;
  onSaveCorrection: (updatedComp: DetectedComponent, rationale: string) => void;
  onClose: () => void;
}

export const PcbManualCorrectionModal: React.FC<PcbManualCorrectionModalProps> = ({
  component,
  onSaveCorrection,
  onClose,
}) => {
  const [refDes, setRefDes] = useState<string>(component.refDes);
  const [marking, setMarking] = useState<string>(component.marking);
  const [decodedValue, setDecodedValue] = useState<string>(component.decodedValue);
  const [packageType, setPackageType] = useState<string>(component.packageType);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(component.verificationStatus);
  const [circuitFunction, setCircuitFunction] = useState<string>(component.circuitFunction);
  const [rationale, setRationale] = useState<string>('Verified against OEM schematic & physical PCB trace inspection.');
  const [technicianId, setTechnicianId] = useState<string>('Tech_RAMT_01');

  const handleSave = () => {
    const updatedComp: DetectedComponent = {
      ...component,
      refDes,
      marking,
      decodedValue,
      packageType,
      verificationStatus,
      circuitFunction,
    };

    onSaveCorrection(updatedComp, rationale);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans text-slate-100">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Technician Verification & Audit Correction</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
          <span className="text-slate-400 block">Original AI Extraction ID: {component.id}</span>
          <span className="text-cyan-400 font-bold block">Ref Des: {component.refDes} ({component.category})</span>
        </div>

        {/* Edit Form */}
        <div className="space-y-3 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Reference Designator:</label>
              <input
                type="text"
                value={refDes}
                onChange={(e) => setRefDes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Decoded Value:</label>
              <input
                type="text"
                value={decodedValue}
                onChange={(e) => setDecodedValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Visible Marking / OCR:</label>
              <input
                type="text"
                value={marking}
                onChange={(e) => setMarking(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Verification Status:</label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="VERIFIED">OEM VERIFIED</option>
                <option value="CROSS_REFERENCED">CROSS-REFERENCED</option>
                <option value="UNVERIFIED">UNVERIFIED</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Circuit Function Notes:</label>
            <textarea
              value={circuitFunction}
              onChange={(e) => setCircuitFunction(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Audit Rationale (Required for Audit Trail):</label>
            <input
              type="text"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 font-mono text-xs">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition-colors shadow"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Save & Log to Audit History</span>
          </button>
        </div>
      </div>
    </div>
  );
};
