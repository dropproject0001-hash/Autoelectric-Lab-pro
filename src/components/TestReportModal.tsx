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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Generate Bench Test Report</h3>
              <p className="text-xs text-slate-400 font-mono">
                Official PDF diagnostic report & certificate of calibration
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

        {/* Modal Body */}
        <div className="space-y-4 py-4 overflow-y-auto flex-1 text-xs">
          {/* Metadata Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-mono text-[11px] mb-1">
                Technician Name / ID:
              </label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono text-[11px] mb-1">
                Repair Order (RO) #:
              </label>
              <input
                type="text"
                value={jobOrderNumber}
                onChange={(e) => setJobOrderNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-mono text-[11px] mb-1">
              Vehicle License Plate / Identifier:
            </label>
            <input
              type="text"
              value={customerPlate}
              onChange={(e) => setCustomerPlate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Test Readings Summary Card */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
              <span className="font-semibold text-slate-300">
                Logged Measurements Included ({readings.length}):
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-emerald-400 font-bold">{passCount} PASS</span>
                <span className="text-slate-600">·</span>
                <span className="text-rose-400 font-bold">{faultCount} FAULTS</span>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 font-mono text-[11px]">
              {readings.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-1.5 bg-slate-900/60 rounded border border-slate-800/80"
                >
                  <span className="text-slate-300">
                    Pin #{r.pinNumber} ({r.pinLabel})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{r.measuredValue} {r.unit}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        r.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : r.status === 'OPEN_CIRCUIT'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                          : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
              {readings.length === 0 && (
                <p className="text-slate-500 italic py-2 text-center font-sans">
                  No readings logged yet. You can still generate a certificate or log readings first.
                </p>
              )}
            </div>
          </div>

          {/* Technician Conclusion */}
          <div>
            <label className="block text-slate-400 font-mono text-[11px] mb-1">
              Diagnostic Verdict & Repair Recommendations:
            </label>
            <textarea
              rows={3}
              value={technicianConclusion}
              onChange={(e) => setTechnicianConclusion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-[11px] font-mono text-slate-500">
            Compliant with standard automotive bench testing records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGeneratePdf}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Signed PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
