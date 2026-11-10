import React from 'react';
import { PCBProject } from '../types/pcbScanner';
import { FileText, Download, X, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface PcbReportExportModalProps {
  project: PCBProject;
  onClose: () => void;
}

export const PcbReportExportModal: React.FC<PcbReportExportModalProps> = ({ project, onClose }) => {
  const handleGeneratePdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Dark header banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 30, 'F');

      doc.setTextColor(6, 182, 212); // cyan-400
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('AUTOELECTRIC LAB PRO — RAMT ENGINEERING SUITE', 14, 14);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`PCB & SCHEMATIC ENGINEERING ANALYSIS REPORT: ${project.name}`, 14, 23);

      // Metadata section
      let y = 38;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT & ECU METADATA:', 14, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Vehicle Platform: ${project.vehicleModel}`, 14, y); y += 5;
      doc.text(`ECU Hardware: ${project.ecuModel} (Part #${project.ecuPartNumber})`, 14, y); y += 5;
      doc.text(`Generated Timestamp: ${new Date().toLocaleString()}`, 14, y); y += 5;
      doc.text(`Total Components Mapped: ${project.components.length} | Nets: ${project.nets.length}`, 14, y); y += 8;

      // Divider line
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y, 196, y);
      y += 8;

      // Component Table Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('MAPPED ELECTRONIC COMPONENTS SUMMARY:', 14, y);
      y += 8;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y - 4, 182, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Ref Des', 16, y);
      doc.text('Category', 38, y);
      doc.text('Marking / Decoded Value', 80, y);
      doc.text('Status', 145, y);
      doc.text('Function', 168, y);
      y += 6;

      // Table Rows
      doc.setFont('helvetica', 'normal');
      project.components.forEach((comp) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.text(comp.refDes, 16, y);
        doc.text(comp.category.substring(0, 18), 38, y);
        doc.text(`${comp.marking || '-'} (${comp.decodedValue})`.substring(0, 32), 80, y);
        doc.text(comp.verificationStatus, 145, y);
        doc.text((comp.circuitFunction || '').substring(0, 25), 168, y);
        y += 6;
      });

      // Save PDF file
      doc.save(`AutoElectric_PCB_Report_${project.name.replace(/\s+/g, '_')}.pdf`);
      onClose();
    } catch (e: any) {
      console.error('Failed to export PDF:', e);
      alert('Error generating PDF report: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans text-slate-100">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Export Technical Engineering PDF Report</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">Project Name:</span>
            <span className="text-white font-bold">{project.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">ECU Model:</span>
            <span className="text-cyan-400">{project.ecuModel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mapped Components:</span>
            <span className="text-emerald-400 font-bold">{project.components.length} items</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Audit History Records:</span>
            <span className="text-slate-300">{project.auditHistory.length} logs</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 font-mono text-xs">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
            Cancel
          </button>
          <button
            onClick={handleGeneratePdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition-colors shadow"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
