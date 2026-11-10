import React, { useState } from 'react';
import { TechnicianAnnotation } from '../types/pcbScanner';
import { X, MessageSquare, AlertCircle, Flame, Scissors, Target, Save } from 'lucide-react';

interface PcbAnnotationModalProps {
  coords: { x: number; y: number };
  onSave: (annotation: Omit<TechnicianAnnotation, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}

export const PcbAnnotationModal: React.FC<PcbAnnotationModalProps> = ({
  coords,
  onSave,
  onClose,
}) => {
  const [category, setCategory] = useState<TechnicianAnnotation['category']>('NOTE');
  const [text, setText] = useState<string>('');
  const [author, setAuthor] = useState<string>('Tech_RAMT_01');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSave({
      x: coords.x,
      y: coords.y,
      category,
      text: text.trim(),
      author: author.trim() || 'Tech_RAMT_01',
    });
  };

  const categories: { id: TechnicianAnnotation['category']; label: string; icon: any; color: string }[] = [
    { id: 'NOTE', label: 'Technician Note', icon: MessageSquare, color: 'text-purple-400 bg-purple-950/60 border-purple-500/40' },
    { id: 'CORROSION', label: 'Corrosion Spot', icon: AlertCircle, color: 'text-amber-400 bg-amber-950/60 border-amber-500/40' },
    { id: 'BURNT_COMPONENT', label: 'Burnt Component', icon: Flame, color: 'text-red-400 bg-red-950/60 border-red-500/40' },
    { id: 'BROKEN_TRACE', label: 'Broken Trace / Cut Track', icon: Scissors, color: 'text-orange-400 bg-orange-950/60 border-orange-500/40' },
    { id: 'TEST_POINT_PIN', label: 'Verified Test Pin', icon: Target, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              ADD TECHNICIAN PCB ANNOTATION
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <span>Coordinates (Normalized):</span>
            <span className="text-cyan-400 font-bold">X: {coords.x} · Y: {coords.y}</span>
          </div>

          {/* Category Picker */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block font-bold mb-2">
              Annotation Category:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs text-left transition-all ${
                      isSelected
                        ? cat.color + ' font-bold shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Text */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block font-bold mb-1.5">
              Inspection Details / Repair Note:
            </label>
            <textarea
              required
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Heavy green oxidation on pad 3 - cleaned and re-soldered with leaded flux."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Author */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block font-bold mb-1.5">
              Technician Name / ID:
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save PCB Annotation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
