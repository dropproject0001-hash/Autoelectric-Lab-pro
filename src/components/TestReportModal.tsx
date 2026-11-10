import React, { useState } from 'react';
import { VehicleProfile, BenchReading } from '../types/automotive';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  X, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Calendar,
  User,
  Hash
} from 'lucide-react';

interface TestReportModalProps {
  vehicle: VehicleProfile;
  readings: BenchReading[];
  onClose: () => void;
}

export const TestReportModal: React.FC<TestReportModalProps> = ({
  vehicle,
  readings,
  onClose,
}) => {
  const [technicianName, setTechnicianName] = useState<string>('Ruben Llego (Master Diagnostic Specialist)');
  const [jobOrderNumber, setJobOrderNumber] = useState<string>(`RO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [customerPlate, setCustomerPlate] = useState<string>('ABC 1234');
  const [technicianConclusion, setTechnicianConclusion] = useState<string>(
    'ECU power distribution, 5V sensor reference rails, low-side injector driver clamp diodes, and high-speed CAN termination tested on bench. Board passed physical voltage drop and impedance thresholds.'
  );

  const passCount = readings.filter((r) => r.status === 'PASS').length;
  const faultCount = readings.filter((r) => r.status !== 'PASS').length;
  const overallVerdict = faultCount === 0 && readings.length > 0 ? 'CERTIFIED BENCH PASS' : 'REPAIR REQUIRED (FAULTS DETECTED)';

  const handleGeneratePdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Dark Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 38, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTOELECTRIC LAB PRO — RAMT ENGINEERING SUITE', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(6, 182, 212); // cyan-400
    doc.text('AUTOMOTIVE ECU BENCH TEST & DIAGNOSTIC CERTIFICATE', 14, 26);

    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(8);
    doc.text(`DATE: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}  |  JOB ORDER: ${jobOrderNumber}`, 14, 33);

    // Vehicle & ECU Specs Block
    let y = 48;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. VEHICLE & UNIT UNDER TEST (UUT)', 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.productionYears})`, 14, y);
    doc.text(`Engine: ${vehicle.engineCode} (${vehicle.engineDisp} ${vehicle.fuelType})`, 110, y);
    y += 5;
    doc.text(`ECU Part #: ${vehicle.ecuPartNumber}`, 14, y);
    doc.text(`Manufacturer: ${vehicle.ecuManufacturer} ${vehicle.ecuModel}`, 110, y);
    y += 5;
    doc.text(`Hardware ID: ${vehicle.hardwareNumber}`, 14, y);
    doc.text(`Plate / ID: ${customerPlate}`, 110, y);
    y += 8;

    // Measurement Table Header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. BENCH MEASUREMENT & OEM TOLERANCE MATRIX', 14, y);
    y += 5;

    // Table Header Row
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 7, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PIN #', 16, y + 5);
    doc.text('LABEL / TEST POINT', 32, y + 5);
    doc.text('MODE', 85, y + 5);
    doc.text('MEASURED', 115, y + 5);
    doc.text('EXPECTED OEM', 145, y + 5);
    doc.text('STATUS', 178, y + 5);
    y += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    if (readings.length === 0) {
      doc.text('No manual bench readings logged yet.', 16, y + 4);
      y += 8;
    } else {
      readings.forEach((r, idx) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 1, pageWidth - 28, 6.5, 'F');
        }

        doc.setTextColor(15, 23, 42);
        doc.text(`#${r.pinNumber}`, 16, y + 3.5);
        doc.text(r.pinLabel.substring(0, 26), 32, y + 3.5);
        doc.text(r.measurementType.replace('_', ' '), 85, y + 3.5);
        doc.text(`${r.measuredValue} ${r.unit}`, 115, y + 3.5);
        doc.text(`${r.expectedMin}-${r.expectedMax} ${r.unit}`, 145, y + 3.5);

        if (r.status === 'PASS') {
          doc.setTextColor(16, 185, 129); // green
          doc.setFont('helvetica', 'bold');
          doc.text('PASS', 178, y + 3.5);
          doc.setFont('helvetica', 'normal');
        } else if (r.status === 'OPEN_CIRCUIT') {
          doc.setTextColor(245, 158, 11); // amber
          doc.setFont('helvetica', 'bold');
          doc.text('OPEN', 178, y + 3.5);
          doc.setFont('helvetica', 'normal');
        } else if (r.status === 'SHORT_CIRCUIT') {
          doc.setTextColor(225, 29, 72); // rose red
          doc.setFont('helvetica', 'bold');
          doc.text('SHORT', 178, y + 3.5);
          doc.setFont('helvetica', 'normal');
        } else {
          doc.setTextColor(244, 63, 94); // rose
          doc.setFont('helvetica', 'bold');
          doc.text(r.status.substring(0, 5), 178, y + 3.5);
          doc.setFont('helvetica', 'normal');
        }

        y += 6.5;
      });
    }

    y += 8;

    // Overall Verdict Box
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('3. DIAGNOSTIC VERDICT & TECHNICIAN CONCLUSION', 14, y);
    y += 6;

    if (overallVerdict.includes('PASS')) {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
    } else {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(244, 63, 94);
    }
    doc.rect(14, y, pageWidth - 28, 22, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`VERDICT: ${overallVerdict}`, 18, y + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitNotes = doc.splitTextToSize(technicianConclusion, pageWidth - 36);
    doc.text(splitNotes, 18, y + 12);
    y += 32;

    // Sign-off
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('AUTHORIZED SIGN-OFF:', 14, y);
    y += 12;

    doc.line(14, y, 90, y);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Technician: ${technicianName}`, 14, y + 4);
    doc.text('AutoElectric Lab Pro Verified Test Record', 14, y + 8);

    doc.save(`AutoElectric_Bench_Report_${jobOrderNumber}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-workstation-panel border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] glass-panel font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-workstation-bg text-workstation-accent border border-white/5 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Generate Engineering Bench Report</h3>
              <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">
                Official PDF Diagnostic Certificate of Calibration
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

        {/* Modal Body */}
        <div className="space-y-5 py-5 overflow-y-auto flex-1 text-xs custom-scrollbar">
          {/* Metadata Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest ml-1">
                Technician ID / Name:
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full bg-workstation-bg border border-white/10 rounded-xl pl-9 pr-4 py-2 text-slate-200 font-mono focus:outline-none focus:border-workstation-accent/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest ml-1">
                Repair Order (RO) #:
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={jobOrderNumber}
                  onChange={(e) => setJobOrderNumber(e.target.value)}
                  className="w-full bg-workstation-bg border border-white/10 rounded-xl pl-9 pr-4 py-2 text-slate-200 font-mono focus:outline-none focus:border-workstation-accent/50 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest ml-1">
              Vehicle Identifier / VIN:
            </label>
            <input
              type="text"
              value={customerPlate}
              onChange={(e) => setCustomerPlate(e.target.value)}
              className="w-full bg-workstation-bg border border-white/10 rounded-xl px-4 py-2 text-slate-200 font-mono focus:outline-none focus:border-workstation-accent/50 transition-all"
              placeholder="e.g. Plate # or Chassis VIN"
            />
          </div>

          {/* Test Readings Summary Card */}
          <div className="bg-workstation-bg/50 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-workstation-secondary" />
                <span className="font-bold text-slate-300 uppercase text-[10px] tracking-widest">
                  Telemetry Payload ({readings.length} Frames)
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="text-status-success font-extrabold">{passCount} PASS</span>
                <span className="text-slate-700">|</span>
                <span className="text-status-error font-extrabold">{faultCount} FAULT</span>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 font-mono text-[10px] custom-scrollbar pr-1">
              {readings.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-workstation-bg/40 rounded-lg border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-workstation-accent font-bold">#{r.pinNumber}</span>
                    <span className="text-slate-400 truncate max-w-[140px]">{r.pinLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-100 font-bold tabular-nums">{r.measuredValue} {r.unit}</span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                        r.status === 'PASS'
                          ? 'bg-status-success/10 text-status-success border-status-success/30'
                          : 'bg-status-error/10 text-status-error border-status-error/30'
                      }`}
                    >
                      {r.status.substring(0, 4)}
                    </span>
                  </div>
                </div>
              ))}
              {readings.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-6 text-slate-600">
                  <AlertTriangle className="w-6 h-6 opacity-20" />
                  <p className="font-sans italic">No telemetry logged for this session.</p>
                </div>
              )}
            </div>
          </div>

          {/* Technician Conclusion */}
          <div className="space-y-1.5">
            <label className="block text-slate-500 font-mono text-[10px] uppercase font-bold tracking-widest ml-1">
              Diagnostic Verdict & Repair Recommendations:
            </label>
            <textarea
              rows={4}
              value={technicianConclusion}
              onChange={(e) => setTechnicianConclusion(e.target.value)}
              className="w-full bg-workstation-bg border border-white/10 rounded-xl p-4 text-slate-200 font-mono text-xs focus:outline-none focus:border-workstation-accent/50 transition-all leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-5 mt-2 border-t border-white/5">
          <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-widest">
            ENGINEERING CERTIFICATE COMPLIANT
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={handleGeneratePdf}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-workstation-bg bg-workstation-accent hover:bg-workstation-accent-light rounded-xl transition-all shadow-lg active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD SIGNED PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>

  );
};
